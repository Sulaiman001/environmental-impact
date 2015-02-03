"""
-------------------------------------------------------------------------------
 | Copyright 2014 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 ------------------------------------------------------------------------------
 """
#   pylint: disable = E1101, E1103, W0703, R0914, R0904, W0141, R0912, R0915
#   pylint: disable = W0621, W0223, E0611

import arcpy, os, zipfile, time, sys, json, urllib2, urllib, collections
from reportlab.lib.pagesizes import A4, portrait
from reportlab.platypus import SimpleDocTemplate, Image, Paragraph, Spacer
from reportlab.platypus import PageBreak, Table
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.rl_config import defaultPageSize
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib import colors
from reportlab.lib.colors import Color
from reportlab.lib.units import inch, cm
from reportlab.lib.utils import ImageReader
from PIL import Image as PILImage
from cStringIO import StringIO
from reportlab.pdfgen import canvas

arcpy.env.overwriteOutput = True

SCRATCH = arcpy.env.scratchFolder

#   Geometry Service to calculate area of input AOI
GEOMETRY_SERVICE_INSTANCE = "http://tasks.arcgisonline.com/ArcGIS/rest/services"
GEOMETRY_SERVICE_TASK = "/Geometry/GeometryServer/areasAndLengths"
GEOMTRY_SERVICE_URL = GEOMETRY_SERVICE_INSTANCE + GEOMETRY_SERVICE_TASK

#   Styles for elements of the table as required
STYLES = getSampleStyleSheet()
STYLEBODYTEXT = STYLES["BodyText"]
STYLEBODYTEXT.wordWrap = 'CJK'

#   Style for the Headers in the beginning of report
STYLES.add(ParagraphStyle(name='HeadingLeft', alignment=TA_LEFT,
                          fontName='Helvetica-Bold', fontSize=15,
                          textColor='cornflowerblue'))

#   Style for count, area, length values in all tables
STYLES.add(ParagraphStyle(name='Right', alignment=TA_RIGHT,
                          fontName='Helvetica', wordWrap='CJK'))

#   Style for header of tables
STYLES.add(ParagraphStyle(name='header_right', alignment=TA_RIGHT,
                          fontName='Helvetica-Bold', wordWrap='CJK'))

STYLES.add(ParagraphStyle(name='error-left', alignment=TA_LEFT,
                          fontName='Helvetica', fontSize=8,
                          textColor=colors.red))

STYLES.add(ParagraphStyle(name='areaStyle', alignment=TA_LEFT, fontSize=13,
                          fontName='Helvetica'))

STYLES.add(ParagraphStyle(name='noDataStyle', alignment=TA_LEFT,
                          fontSize=10, fontName='Helvetica'))

STYLES.add(ParagraphStyle(name='HeadersBold', fontName='Helvetica-Bold',
                          fontSize=10))


#   Specify Page width and height
PAGE_HEIGHT = defaultPageSize[1]
PAGE_WIDTH = defaultPageSize[0]

#   Report format
DETAIL_REPORT_TYPE = "Detailed"
QUICK_REPORT_TYPE = "Quick"

REPORT_FORMAT = arcpy.GetParameterAsText(2)

#   Specify logo image path
LOGO_URL = arcpy.GetParameterAsText(8)
#   Specify Subtitle for the report
REPORT_SUBTITLE = arcpy.GetParameterAsText(9).replace("&", "and") or\
                  "Area of Interest (AOI) Information"

#   Specify message to be shown when no fields are provided to summurized
NO_FIELDS_MSG = ("* There is known impact, but no fields are provided to" +
                 " summarize.")

INCORRECT_FIELDS_MSG = "* Some incorrect fields provided : "

class NumberedCanvas(canvas.Canvas):
    """ Class to print page numbers out of total pages  on each page """
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        """ Show Page """
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        """add page info to each page (page x of y)"""
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        """ Write page number out of total pages in footer canvas """
        self.setFont("Helvetica", 8)
        self.setFillGray(0.70)
        self.drawString(47.5, 36, "Page %d of %d" % (self._pageNumber,
                                                     page_count))


def calculate_area(area_of_interest, report_units):
    """
    This function helps to calculate area of AOI
    """
    try:
        #   Check the Report units type and set the Output Units for calculating
        #   area of AOI
        if report_units.upper() == "Metric".upper():
            area_unit = ["esriSquareKilometers", "SqKm"]
        else:
            area_unit = ["esriAcres", "Acres"]

        aoi_fesatureset = arcpy.FeatureSet()
        aoi_fesatureset.load(area_of_interest)
        area_of_interest = convert(json.loads(aoi_fesatureset.JSON))

        #   Find out Spatial Reference and rings of provided AOI and calculate
        #   its area using Geometry Service
        if area_of_interest['spatialReference'].has_key("wkid"):
            spatial_ref = area_of_interest['spatialReference']['wkid']
        elif area_of_interest['spatialReference'].has_key("wkt"):
            wkt = str(area_of_interest['spatialReference']['wkt'])
            spatial_ref = {"wkt" : wkt}

        ring = area_of_interest['features'][0]['geometry']
        rings = []
        rings.append(ring)
        geo_params = {'sr':spatial_ref, 'polygons':rings,
                      'lengthUnit': "", 'areaUnit':{"areaUnit" : area_unit[0]},
                      'f':'json'}

        arcpy.AddMessage("Calculating area of drawn AOI...")

        data = urllib.urlencode(geo_params)
        request = urllib2.Request(GEOMTRY_SERVICE_URL, data)
        aoi_area = json.loads(urllib2.urlopen(request).read())
        area = "{:,}".format(round(aoi_area['areas'][0], 2))
        area_string = "{0} {1}".format(area, area_unit[1])
        arcpy.AddMessage("Area of AOI calculated successfully.")
        return area_string

    except arcpy.ExecuteError:
        arcpy.AddError("Error occurred during calculating area:")
        return False

    except Exception:
        arcpy.AddError("Error occurred during calculating area:")
        return False

def convert(data):
    """
    Removes the Unicode characters from the dictionary
    """
    if isinstance(data, basestring):
        return str(data)
    elif str(data) == 'True':
        return 'true'
    elif data == None:
        return 'null'
    elif isinstance(data, collections.Mapping):
        return dict(map(convert, data.iteritems()))
    elif isinstance(data, collections.Iterable):
        return type(data)(map(convert, data))
    else:
        return data

def create_image_to_print(web_map_as_json):
    """
    This function helps to create PNG format Image which will be inserted into
    PDF report
    """
    try:
        arcpy.AddMessage("Printing Image..")
        # Setting parameters for Export web map server
        output_file = SCRATCH  + os.sep + "image.png"
        image_format = "PNG32"

        converted_web_json = convert(web_map_as_json)

        # Exporting web map as json into image

        webmap_img_path = arcpy.ExportWebMap_server(
            str(converted_web_json), output_file, image_format, "",
            "A4 Portrait")[0]

        for img in os.listdir(SCRATCH):
            if img.endswith(".png"):
                webmap_img_path = SCRATCH + os.sep + img
                break

        arcpy.AddMessage(webmap_img_path)
        return webmap_img_path

    except arcpy.ExecuteError:
        arcpy.AddError("Error occurred while printing image :")
        return False

    except Exception:
        arcpy.AddError("Error occurred while printing image :")
        return False


def validate_detailed_report(web_map_as_json, area_of_interest, uploaded_zip,
                             report_units, detailed_fields):
    """This function helps to validate input parameters for detailed report type
    """
    aoi_area = ""
    image = ""

    #   Calculate area of provided AOI
    aoi_area = calculate_area(area_of_interest, report_units)

    if not aoi_area:
        arcpy.AddWarning("Failed to calculate web map area." +
                         " It will not be shown on report.")

    #   If WebMapJSON is provided, include image in the PDF Report
    if web_map_as_json != "":
        image = create_image_to_print(web_map_as_json)
        if not image:
            arcpy.AddWarning("Failed to get image from web map." +
                             " It will not be drawn on report.")

    #   Clip the layers with provided AOI
    summary_data, all_layers_data = clip_layers(
        detailed_fields, area_of_interest, report_units, uploaded_zip)

    #   Generate PDF using all generated data after analysis
    pdf_path = generate_pdf(image, summary_data, all_layers_data,
                            aoi_area, "")
    return pdf_path

def extract_zip(zip_file_name):
    """ This function extracts the zip file in scratch workspace. """
    try:
        #   Opening zip file in rb mode
        zip_data = open(zip_file_name, "rb")
        zip_data.read()
        archive = zipfile.ZipFile(zip_data)

        #   Check if valid zip URL is provided
        if archive.testzip() != None:
            arcpy.AddMessage("Invalid zipfile!")
            sys.exit()
        else:
            #   Extracting zip file
            zip_name = zip_file_name.split("\\")[-1][:-4]
            zip_dir_path = os.path.join(SCRATCH, zip_name)

            #   If folder with same zip file name already exists, remove it
            #   first and create a new one to extract the zip
            if os.path.exists(zip_dir_path):
                arcpy.AddMessage(("Removing already existing path {0}")
                                 .format(zip_dir_path))
                for files in os.listdir(zip_dir_path):
                    os.remove(os.path.join(zip_dir_path, files))
                os.rmdir(zip_dir_path)
            os.mkdir(zip_dir_path)
            archive.extractall(zip_dir_path)

        #   Closing zip file to release the lock
        zip_data.close()
        arcpy.AddMessage("Zip file extracted at : {0}".format(zip_dir_path))
        return zip_dir_path

    except zipfile.BadZipfile:
        arcpy.AddError("Error occurred while extracting zip file:")
        sys.exit()


def clip_layers(detailed_fields, area_of_interest, report_units, zip_file_path):
    """ This fucntion sends the valid layers and also valis shapefile from
    uploaded zip for Clip ans Statistic Analysis """
    #   Check for report type provided, and set the output Units and build the
    #   expression required for CalculateField operation
    if report_units.upper() == "METRIC":
        area_unit = 'Area(SqKm)'
        length_unit = 'Length(Meter)'
        area_calc_expression = "!SHAPE.AREA@SQUAREKILOMETERS!"
        length_calc_expression = "!SHAPE.LENGTH@METERS!"
    elif report_units.upper() == "STANDARD":
        area_unit = 'Area(Acres)'
        length_unit = 'Length(Miles)'
        area_calc_expression = "!SHAPE.AREA@ACRES!"
        length_calc_expression = "!SHAPE.LENGTH@MILES!"


    #   Create a dict that stores index at which the calculated impact value to
    #   be inserted in Summary Table data, the expression required for
    #   CalculateField operation and summary column headings
    statistic_field = {"POLYLINE" : [4, length_calc_expression, length_unit],
                       "POLYGON" : [3, area_calc_expression, area_unit],
                       "POINT" : [2, "", "Count"]}

    #   List to store the summary details of layers
    summary_data = [["Name", "Impact", "Count", area_unit, length_unit]]
    #   List to store the individual details of layers
    all_layers_data = []

    for lyr_object in detailed_fields:
        ind_lyr_tables = {}
        data_type = arcpy.Describe(lyr_object.keys()[0]).DataType.upper()
        shape_type = arcpy.Describe(lyr_object.keys()[0]).shapeType.upper()

        #   Include only Feature layer for analysis
        if data_type.upper() == "FEATURELAYER":
            arcpy.AddMessage("Clipping '{0}' ...".format(lyr_object.keys()[0]))

            lyr_fields = lyr_object[lyr_object.keys()[0]]
            arcpy.AddMessage("Fields provided : {0}".format(lyr_fields.keys()))

            # Get the table generated after StatisticAnalysis and also
            #   individual layer details
            out_stat_tbl, lyr_summary_info, invalid_fields = get_stat_table(
                lyr_object.keys()[0], area_of_interest, lyr_fields.keys(),
                statistic_field[shape_type], False)

            #   If Layer dont have impact in AOI, directly append the details to
            #   summary table
            if not out_stat_tbl:
                summary_data += [lyr_summary_info]
                continue

            #   If layer is having impact in AOI, get the individual layers
            #   details
            layer_tables_data = get_layer_table_data(
                out_stat_tbl, lyr_fields, statistic_field[shape_type],
                invalid_fields)

            #   Append individual layers details in the single list and also
            #   summary data in summary table list
            ind_lyr_tables[lyr_object.keys()[0]] = layer_tables_data
            all_layers_data.append(ind_lyr_tables)
            summary_data += [lyr_summary_info]

    #   If shapefile is uploaded perform analysis for it
    if zip_file_path != "":
        zip_dir_path = extract_zip(zip_file_path)
        for shape_file in os.listdir(zip_dir_path):
            #   Get the shapefile
            if shape_file.endswith(".shp"):
                ind_lyr_tables = {}
                arcpy.AddMessage("Clipping {0} layer...".format(shape_file))

                #   Load the shapefile in feature set for processing
                lyr = arcpy.FeatureSet()
                lyr.load(zip_dir_path + os.path.sep + shape_file)

                shape_type = arcpy.Describe(lyr).shapeType.upper()

                #   Exclude the not required fields from statistic
                fields = arcpy.Describe(lyr).fields
                not_include_field = ["AREA", "LENGTH", "ID", "OID", "OBJECTID",
                                     "OBJECTID_1"]
                lyr_fields = {}
                for fld in fields:
                    if (not fld.name.upper() in not_include_field and
                            not (str(fld.name).upper()).startswith(("SHAPE",
                                                                    "FID"))):
                        lyr_fields[fld.name] = fld.aliasName
                arcpy.AddMessage("Fields provided : {0}"
                                 .format(str(lyr_fields)))

                #   Get the table generated after StatisticAnalysis and also
                #   shapefile details
                out_stat_tbl, lyr_summary_info, invalid_fields = get_stat_table(
                    lyr, area_of_interest, lyr_fields.keys(),
                    statistic_field[shape_type], shape_file[:-4])

                #   If Layer dont have impact in AOI, directly append the
                #   details to summary table
                if not out_stat_tbl:
                    summary_data += [lyr_summary_info]
                    break
                #   If shapefile is having impact in AOI, get the details
                layer_tables_data = get_layer_table_data(
                    out_stat_tbl, lyr_fields, statistic_field[shape_type],
                    invalid_fields)

                ind_lyr_tables[shape_file[:-4]] = layer_tables_data
                all_layers_data.append(ind_lyr_tables)
                summary_data += [lyr_summary_info]
                break

    return summary_data, all_layers_data


def get_stat_table(lyr, area_of_interest, lyr_fields, shape_type, shp_name):
    """ This function performs the Clip Analysis on the providede layer.
    If any feature intersects the AOI, it performs statistic analysis using
    provided fields. It stores the layer's information for Summary Table. """
    #   Get the name of the layer/shapefile
    if shp_name:
        layer_name = shp_name
    else:
        layer_name = lyr

    lyr_summary_info = [Paragraph(layer_name, STYLEBODYTEXT)]
    #   Validate the name of output feature class after clip analysis
    valid_out_feature_name = arcpy.ValidateFieldName(str(layer_name)\
                                                     .replace(" ", ""),
                                                     "in_memory")
    out_features = os.path.join(r"in_memory", valid_out_feature_name)
    arcpy.Clip_analysis(lyr, area_of_interest, out_features)

    layer_summary_data = {}
    #   If clipped feature class has some features then performs Statistic
    #   analysis on provided fields
    if int(arcpy.GetCount_management(out_features)[0]) > 0:
        lyr_summary_info += ["Potential Impact", "0", "0", "0"]

        #   Add field to the output feature class to store calculated area
        if arcpy.Describe(lyr).shapeType.upper() in ["POLYGON", "POLYLINE"]:
            # Add validate field name for newly added field
            new_field_name = arcpy.ValidateFieldName("Calc_Shape", out_features)
            arcpy.AddField_management(out_features, new_field_name, "DOUBLE")
            expression = shape_type[1]
            arcpy.CalculateField_management(out_features, new_field_name,
                                            expression, "PYTHON_9.3")
        else:
            new_field_name = arcpy.Describe(out_features).OIDFieldName

        #   Check for the valid fields provided in lyr_fields
        #   (DetailedReportFields) parameters
        desc_fields = [field.name for field in \
                       arcpy.Describe(out_features).fields]
        valid_fields = [fld for fld in lyr_fields if fld in desc_fields]
        invalid_fields = [fld for fld in lyr_fields if fld not in desc_fields]

        out_stat_table = os.path.join(r"in_memory",
                                      str(layer_name).replace(" ", "") +
                                      "_stat")
        arcpy.Statistics_analysis(out_features, out_stat_table,
                                  [[new_field_name, "SUM"]], valid_fields)

        #   Get the field added by Statistic analysis which is used for summary
        sum_field = [field.name for field in arcpy.ListFields(out_stat_table) \
                     if field.name != arcpy.Describe(out_stat_table)\
                     .OIDFieldName and field.name.upper() in \
                     ("SUM_" + new_field_name).upper()][0]

        #   For point feature class, copy the FREQUENCY values in "Count" field
        if arcpy.Describe(lyr).shapeType.upper() == "POINT":
            arcpy.DeleteField_management(out_stat_table, sum_field)
            arcpy.AddField_management(out_stat_table, "Count")
            arcpy.CalculateField_management(out_stat_table, "Count",
                                            "!FREQUENCY!", "PYTHON_9.3")
            sum_field = "Count"

        #   Delete the FREQUENCY from output table
        arcpy.DeleteField_management(out_stat_table, "FREQUENCY")

        #   Add up the summary values to get total impacted Count/Area/Length
        impact_value = 0
        with arcpy.da.SearchCursor(out_stat_table, [sum_field]) as stat_cursor:
            for row in stat_cursor:
                impact_value += row[0]

        if isinstance(impact_value, int) or isinstance(impact_value, long):
            impact_value = str(format(impact_value, '8,d'))
        elif isinstance(impact_value, float):
            impact_value = "{:,}".format(round(impact_value, 2))
        lyr_summary_info[shape_type[0]] = [Paragraph(impact_value,
                                                     STYLES["Right"])]

        layer_summary_data[layer_name] = [lyr_summary_info]
        return out_stat_table, lyr_summary_info, invalid_fields
    else:
        lyr_summary_info += ["No known Impact", "0", "0", "0"]
        layer_summary_data[layer_name] = [lyr_summary_info]
        return None, lyr_summary_info, ""

def get_layer_table_data(out_stat_table, lyr_fields, sum_value_header,
                         invalid_fields):
    """ It generates the list having layer details required for individual layer
    tables in PDF """
    layer_tables_data = [[]]
    oid_field_name = arcpy.Describe(out_stat_table).OIDFieldName

    #   Get the fields from statistic table for spliting them in batch
    #   while printing tables of maximum 3 fields columns
    stat_fields = [field.name for field in arcpy.ListFields(out_stat_table) \
                   if not field.name.upper() == oid_field_name]

    continue_process = True
    start_index = 0
    column_limit = 3

    while continue_process:
        field_values = []
        with arcpy.da.SearchCursor(out_stat_table,
                                   stat_fields[start_index:column_limit]) \
                                   as s_cursor:
            #   Add the layers to the tables
            field_headers = ["#"]
            for i in xrange(len(stat_fields[start_index:column_limit])):
                try:
                    value = lyr_fields[stat_fields[start_index:column_limit][i]]
                    header_para = Paragraph(str(value), STYLES["HeadersBold"])
                    field_headers += [header_para]
                except IndexError:
                    continue
                except KeyError:
                    header_para = Paragraph(str(sum_value_header[2]),
                                            STYLES["HeadersBold"])
                    field_headers += [header_para]

            field_values += [field_headers]

            #   Add values to the table
            row_index = 1
            for row in s_cursor:
                row_values = [row_index]
                for j in xrange(3):
                    try:
                        if isinstance(row[j], int) or isinstance(row[j], long):
                            value = str(format(row[j], '8,d'))
                        elif isinstance(row[j], float):
                            value = "{:,}".format(round(row[j], 2))
                        else:
                            value = str(row[j])
                        row_value_para = Paragraph(value, STYLEBODYTEXT)
                        row_values += [row_value_para]
                    except IndexError:
                        continue
                row_index += 1
                field_values += [row_values]

        layer_tables_data[0] += [field_values]

        start_index = column_limit
        if start_index >= len(stat_fields):
            continue_process = False
        else:
            column_limit = start_index + column_limit
            if column_limit > len(stat_fields):
                column_limit = len(stat_fields)

    # Add messages according to condition
    if invalid_fields:
        layer_tables_data += [INCORRECT_FIELDS_MSG +
                              ", ".join(map(str, invalid_fields))]
    else:
        if len(stat_fields) == 1:
            layer_tables_data += [NO_FIELDS_MSG]
        else:
            layer_tables_data += [[]]

    return layer_tables_data


def generate_pdf(image, summary_data, all_layers_data, area, quick_json):
    """
    This function helps to generate PDF report for quick summary report and
    detailed summary report
    """
    try:
        arcpy.AddMessage("Generating PDF ...")
        #   Set Title of PDF according to report type
        if REPORT_FORMAT == QUICK_REPORT_TYPE:
            pdf_name = SCRATCH + os.sep + "Quick Summary Report.pdf"

        elif REPORT_FORMAT == DETAIL_REPORT_TYPE:
            pdf_name = (SCRATCH + os.sep +
                        "Environmental Impact Analysis Report.pdf")

        #   Create PDF Doc at specified path
        doc = SimpleDocTemplate(pdf_name)
        doc.pagesize = portrait(A4)
        doc.topMargin = 90

        #   Specify height and width for Layout
        height = 8.50 * inch
        width = 6.35 * inch

        parts = []
        parts.append(Spacer(0.15, 0.15 * inch))

        heading1 = REPORT_SUBTITLE
        parts.append(Paragraph(heading1, STYLES["HeadingLeft"]))
        parts.append(Spacer(0.20, 0.20* inch))

        heading3 = "Area: "
        parts.append(Paragraph(heading3 + str(area),
                               STYLES["areaStyle"]))
        parts.append(Spacer(0.05, 0.05* inch))

        #   If web map provided insert image in PDF doc if generated
        #   successfully else insert error string
        if image != "":
            if not image:
                parts.append(Spacer(1, 1 * inch))
                parts.append(Paragraph("Image can not be displayed.",
                                       STYLES['error-left']))
            else:
                img = Image(str(image), width, height)
                img.hAlign = TA_CENTER
                parts.append(img)
            parts.append(PageBreak())


        if REPORT_FORMAT == DETAIL_REPORT_TYPE:
            #   Build Detailed PDF Report if report type is Detailed
            arcpy.AddMessage("Building PDF for {0}.".format(REPORT_FORMAT))
            heading4 = "Summary of Impact"
            parts.append(Spacer(0.20, 0.20 * inch))
            parts.append(Paragraph(heading4, STYLES["HeadingLeft"]))
            parts.append(Spacer(0.20, 0.20 * inch))

            # Summary table

            tbl = Table(summary_data,
                        colWidths=[5.0*cm, 3.4*cm, 2*cm, 2.6*cm, 2.7*cm],
                        style=[('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                               ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
                               ('VALIGN', (0, 1), (-1, -1), 'TOP'),
                               ('ALIGN', (2, 0), (4, -1), 'RIGHT'),
                               ('ALIGN', (0, 0), (1, -1), 'LEFT'),
                               ('BACKGROUND', (0, 0), (4, 0), colors.lavender)])
            parts.append(Spacer(0.20, 0.20 * inch))
            parts.append(tbl)
            parts.append(Spacer(0.20, 0.20 * inch))

            # Individual Layers Table
            for layer_details in all_layers_data:
                parts.append(Spacer(0.30, 0.30 * inch))
                layer_heading = (str(layer_details.keys()[0]) +
                                 " - Impact Information")
                parts.append(Paragraph(layer_heading, STYLES["HeadingLeft"]))
                parts.append(Spacer(0.20, 0.20 * inch))

                for field_section in layer_details[layer_details.keys()[0]][0]:
                    #arcpy.AddMessage(field_section)
                    col_widths = [0.9*cm]
                    for _ in xrange(len(field_section[0][1:])):
                        col_widths += [4.9*cm]
                    tbl = Table(field_section, colWidths=col_widths,
                                hAlign='LEFT',
                                style=[('GRID', (0, 0), (-1, -1), 0.5,
                                        colors.black),
                                       ('FONT', (0, 0), (-1, 0),
                                        'Helvetica-Bold', 10),
                                       ('BACKGROUND', (0, 0), (-1, 0),
                                        colors.lavender),
                                       ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                                       ('ALIGN', (0, 0), (0, -1), 'CENTER')])
                    parts.append(Spacer(0.20, 0.20 * inch))
                    parts.append(tbl)
                if len(layer_details[layer_details.keys()[0]][1]) > 0:
                    val = str(layer_details[layer_details.keys()[0]][1])
                    no_impact_para = Paragraph(val, STYLES['noDataStyle'])
                    parts.append(Spacer(0.10, 0.10 * inch))
                    parts.append(no_impact_para)


        if REPORT_FORMAT == QUICK_REPORT_TYPE:
            #   Build Quick PDF Report if report type is Quick
            arcpy.AddMessage("Building PDF for {0}.".format(REPORT_FORMAT))
            parts = get_quick_report_data(parts, quick_json)

        #   Build the PDF doc
        doc.build(parts, onFirstPage=on_first_page, onLaterPages=on_later_pages,
                  canvasmaker=NumberedCanvas)

        arcpy.AddMessage("PDF is created at: " + pdf_name)
        return pdf_name

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occurred during generating PDF :" + str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occurred during generating PDF :" + str(error))
        sys.exit()

def get_quick_report_data(parts, quick_json):
    """ This function generated the table to be included in PDF doc for Quick
    type"""
    #   Maintain dictionary for setting header of tables
    unit_dict = {"standard" : {"area" : "Area(acres)",
                               "length" : "Length(Miles)",
                               "count" : "Count"},
                 "metric" : {"area": "Area(SqKm)",
                             "length" : "Length(Meter)",
                             "count" : "Count"},
                 "" : {"area" : "Area(acres)",
                       "length" : "Length(Miles)",
                       "count" : "Count"}}
    try:
        #   Insert Summary Table
        parts.append(Spacer(0.20, 0.20 * inch))
        parts.append(Paragraph("Summary of Potential Impact", STYLES["HeadingLeft"]))
        parts.append(Spacer(0.20, 0.20 * inch))

        summary_list = []
        summary_header = ["Name", "Impact", "Count"]
        #   Insert headers of summary tables as per unit type provided
        for layer_item in quick_json:
            if layer_item["summaryType"].upper() in ["AREA", "LENGTH", ""]:
                if layer_item["summaryUnits"].upper() == "METRIC":
                    summary_header += ["Area(SqKm)", "Length(Meter)"]
                elif layer_item["summaryUnits"].upper() in ["STANDARD", ""]:
                    summary_header += ["Area(acres)", "Length(Miles)"]
                break

        summary_list.append(summary_header)

        #   Insert the total values of all the layer summary fields
        for layer_item in quick_json:
            layer_name = Paragraph(layer_item["layerName"], STYLEBODYTEXT)
            layer_list = [layer_name]
            if layer_item["summaryType"] == "":
                layer_list += ["No Potential Impact", "0", "0", "0"]
            else:
                if layer_item["summaryFields"] == []:
                    layer_list += ["Potential Impact", "0", "0", "0"]
                else:
                    field_value_total = 0
                    for field in layer_item["summaryFields"][0]["fieldValues"]:
                        if (isinstance(field[field.keys()[0]], str) or
                                isinstance(field[field.keys()[0]], unicode)):
                            raise Exception("Non numeric value found for" +
                                            " - {0} : {1}."
                                            .format(field.keys()[0],
                                                    field[field.keys()[0]]))
                        field_value_total += field[field.keys()[0]]

                    if (isinstance(field_value_total, int) or
                            isinstance(field_value_total, long)):
                        value = str(format(field_value_total, '8,d'))
                    else:
                        value = "{:,}".format(round(field_value_total, 2))

                    impact_value = Paragraph(value, STYLES['Right'])

                    if layer_item["summaryType"].upper() == "COUNT":
                        layer_list += ["Potential Impact", impact_value, "0", "0"]

                    elif layer_item["summaryType"].upper() == "AREA":
                        layer_list += ["Potential Impact", "0", impact_value, "0"]

                    elif layer_item["summaryType"].upper() == "LENGTH":
                        layer_list += ["Potential Impact", "0", "0", impact_value]

            summary_list.append(layer_list)

        summary_table = Table(
            summary_list, vAlign='TOP', colWidths=[5.0*cm, 3.4*cm, 2*cm, 2.7*cm,
                                                   2.7*cm],
            style=[('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                   ('FONT', (0, 0), (4, 0), 'Helvetica-Bold', 10),
                   ('VALIGN', (0, 1), (-1, -1), 'TOP'),
                   ('ALIGN', (2, 0), (4, -1), 'RIGHT'),
                   ('ALIGN', (0, 0), (1, -1), 'LEFT'),
                   ('BACKGROUND', (0, 0), (4, 0), colors.lavender)])
        parts.append(summary_table)

        #   Insert Individual Layer data
        for i in xrange(len(quick_json)):
            if quick_json[i]["summaryType"] != "":
                #   Insert Layer name header
                lyr_name = quick_json[i]["layerName"] + " - Potential Impact Information"

                parts.append(Spacer(0.20, 0.20 * inch))
                parts.append(Paragraph(lyr_name, STYLES["HeadingLeft"]))
                parts.append(Spacer(0.10, 0.10 * inch))
                if len(quick_json[i]["summaryFields"]) > 0:
                    #   Insert fields data in table
                    for fields in quick_json[i]["summaryFields"]:
                        unit = quick_json[i]['summaryUnits'].lower()
                        u_type = quick_json[i]['summaryType'].lower()
                        field_header_unit = unit_dict[unit][u_type]
                        field_header = [fields['fieldName'],
                                        Paragraph(field_header_unit,
                                                  STYLES["header_right"])]
                        field_data = []
                        #   Insert header in field table
                        field_data.append(field_header)

                        fields['fieldValues'].sort()
                        #   Insert values of each field
                        for j in xrange(len(fields['fieldValues'])):
                            for the_key, the_value in fields['fieldValues'][j].\
                                                            iteritems():
                                if (isinstance(the_value, str) or
                                        isinstance(the_value, unicode)):
                                    raise Exception("Non numeric value found" +
                                                    " for - {0} : {1}."
                                                    .format(the_key, the_value))

                                if isinstance(the_value, float):
                                    val = "{:,}".format(round(the_value, 2))
                                elif isinstance(the_value, int) or\
                                     isinstance(the_value, long):
                                    val = str(format(the_value, '8,d'))

                                impact_val = Paragraph(val, STYLES['Right'])
                                value = [the_key, impact_val]
                            field_data.append(value)
                        field_value_table = Table(
                            field_data,
                            style=[('GRID', (0, 0), (-1, -1), 0.5,
                                    colors.black),
                                   ('LEFTPADDING', (0, 0), (1, 0), 6),
                                   ('FONT', (0, 0), (1, 0), 'Helvetica-Bold',
                                    10),
                                   ('BACKGROUND', (0, 0), (1, 0),
                                    colors.lavender)],
                            colWidths=(5.0*inch, 1.1*inch))
                        parts.append(Spacer(0.20, 0.20 * inch))
                        #   Insert field value table for each field in PDF
                        parts.append(field_value_table)

                elif len(quick_json[i]["summaryFields"]) == 0:
                    no_fields_para = Paragraph(NO_FIELDS_MSG,
                                               STYLES['noDataStyle'])
                    parts.append(Spacer(0.10, 0.10 * inch))
                    parts.append(no_fields_para)

        return parts
    except Exception as error:
        arcpy.AddError(error)
        sys.exit()

def on_first_page(canvas, doc):
    """ To draw header and footer on first page """
    canvas.saveState()
    header(canvas, doc)
    now = time.strftime("%c")
    doc_date = "Date: " + str(now)
    canvas.drawString(PAGE_WIDTH - 192, PAGE_HEIGHT - 105, doc_date)
    footer(canvas, doc)
    canvas.restoreState()


def on_later_pages(canvas, doc):
    """ Draw header and footer on every other page """
    canvas.saveState()
    header(canvas, doc)
    footer(canvas, doc)
    canvas.restoreState()

def footer(canvas, doc):
    """ Draw page footer """
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillGray(0.70)

    if REPORT_FORMAT == QUICK_REPORT_TYPE:
        title = "Quick Summary Report"
        canvas.drawString(PAGE_WIDTH - 130, 0.5 * doc.bottomMargin, title)

    elif REPORT_FORMAT == DETAIL_REPORT_TYPE:
        title = "Environmental Impact Analysis Report"
        canvas.drawString(PAGE_WIDTH - 182, 0.5 * doc.bottomMargin, title)

    canvas.setLineWidth(1)
    canvas.setStrokeColor(Color(0, 0.2627450980392157, 0.42745098039215684, 1))
    line_x = doc.leftMargin - 25
    line_y = 0.75*doc.bottomMargin
    canvas.line(line_x, line_y, (PAGE_WIDTH - line_x), line_y)

    canvas.restoreState()

def header(canvas, doc):
    """ Draw page header """
    image = None
    image = get_image(LOGO_URL)

    #   Set Title for page
    if REPORT_FORMAT == QUICK_REPORT_TYPE:
        title = "Quick Summary Report"

    elif REPORT_FORMAT == DETAIL_REPORT_TYPE:
        title = "Environmental Impact Analysis Report"
    canvas.saveState()
    header_top_padding = 1.5*cm
    image_width = 1.5*cm
    image_height = 1.5*cm
    header_width = 565.2
    header_height = 40
    logo_header_gap = 0.25*cm

    # used for header and footer title and divider line
    indent_right = 50
    style_table = STYLES['Title']
    style_table.backColor = Color(0, 0.2627450980392157, 0.42745098039215684, 1)
    style_table.textColor = Color(1, 1, 1, 1)
    style_table.borderPadding = (3, 3, 2, 3)
    style_table.alignment = TA_LEFT
    # "doc.rightMargin + X" to adjust the width of header to align it
    # from right page margin
    style_table.rightIndent = doc.rightMargin + 49.5
    style_table.fontSize = 15
    logo_aspect_ratio = None

    if len(LOGO_URL) == 0:
        style_table.rightIndent = doc.rightMargin
        image_width = 0
        logo_header_gap = 0
    if image:
        logo_aspect_ratio = image.size[0]/float(image.size[1])
    if logo_aspect_ratio > 1.2:
        image_width = logo_aspect_ratio * image_height
        header_width -= image_width - image_height

    para = Paragraph('<font>' + title + '</font>', style_table, )
    _, para_height = para.wrap(header_width, header_height)

    logo_y = ((para_height + image_height) / 2) + header_top_padding

    # draw logo on header
    if image:
        canvas.drawImage(ImageReader(image), indent_right, PAGE_HEIGHT-logo_y,
                         image_width, image_height, mask='auto')
    para_y = para_height + header_top_padding
    # draw header text
    para.drawOn(canvas, (indent_right + image_width + logo_header_gap),
                (PAGE_HEIGHT - para_y))
    canvas.setLineWidth(1)
    canvas.setStrokeColor(Color(0, 0.2627450980392157, 0.42745098039215684, 1))
    line_y = PAGE_HEIGHT-82
    canvas.line(indent_right-3, line_y, (PAGE_WIDTH - indent_right) + 1, line_y)

    canvas.restoreState()


def get_image(image_url):
    """ Get a image from remote host """
    try:
        if len(image_url) > 0:
            return PILImage.open(StringIO(urllib.urlopen(image_url).read()))
        else:
            return None

    except Exception as error:
        arcpy.AddError("Error occurred while printing image." + str(error))
        sys.exit()

def validate_quick_report(web_map_as_json, quick_summary_json,
                          area_of_interest):
    """This function helps to validate input parameters for quick report type.
    """
    try:
        raw_string = quick_summary_json.encode("unicode-escape")
        quick_summary_json = json.loads(raw_string)
        aoi_area = ""
        image = ""
        unit_type = check_summary_units(quick_summary_json)

        aoi_area = calculate_area(area_of_interest, unit_type)

        if not aoi_area:
            arcpy.AddWarning("Failed to calculate web map area." +
                             " It will not be shown on report.")

        #   If WebMapJSON is provided, include image in the PDF Report
        if web_map_as_json != "":
            image = create_image_to_print(web_map_as_json)
            if not image:
                arcpy.AddWarning("Failed to get image from web map." +
                                 " It will not be drawn on report.")

        #   Generate PDF using all provided json data
        pdf_path = generate_pdf(image, [], [], aoi_area, quick_summary_json)
        return pdf_path

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occurred during validate_quick_report:" +
                       str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occurred during validate_quick_report:" +
                       str(error))
        sys.exit()

def check_summary_units(quick_summary_json):
    """ Check which type of units need to be used for area/length calculations
    """
    try:
        unit_found = False
        for layer in quick_summary_json:
            if layer["summaryUnits"] != "":
                unit_found = True
                return layer["summaryUnits"]

        if not unit_found:
            return "standard"

    except Exception as error:
        arcpy.AddError(str(error))


def main():
    """ Main Function """
    web_map_as_json = arcpy.GetParameterAsText(1).strip()

    area_of_interest = arcpy.GetParameterAsText(3)

    detailed_fields = arcpy.GetParameterAsText(4).replace("&", "and")
    uploaded_zip = arcpy.GetParameterAsText(5)
    quick_summary_json = arcpy.GetParameterAsText(6).replace("&", "and").strip()
    report_units = arcpy.GetParameterAsText(7)

    #   Check if valid AOI is provided. It should have at least 1 polygon feature
    aoi_featset = arcpy.FeatureSet()
    aoi_featset.load(area_of_interest)
    aoi_feat_count = int(arcpy.GetCount_management(aoi_featset)[0])

    if aoi_feat_count == 0:
        arcpy.AddError("Provided AOI has no polygon features." +
                       " Please provide valid AOI for analysis.")
        return

    #   Generate PDF for Detailed type
    if REPORT_FORMAT == DETAIL_REPORT_TYPE:
        #   Report units are required for Detailed Report type
        if report_units == "":
            arcpy.AddError("Report Units must be provided.")
            return

        if detailed_fields == "":
            arcpy.AddError("Fields must be provided to generate detailed " +
                           "report.")
            return

        field_unicode_json = json.loads(detailed_fields)
        detailed_fields = convert(field_unicode_json)
        arcpy.AddMessage(detailed_fields)

        pdf_path = validate_detailed_report(
            web_map_as_json, area_of_interest, uploaded_zip,
            report_units, detailed_fields)
        if not pdf_path:
            return
        else:
            #   Set Detailed PDF Report File path as output parameter
            arcpy.SetParameter(10, pdf_path)

    #   Generate PDF for Quick type
    elif REPORT_FORMAT == QUICK_REPORT_TYPE:
        if quick_summary_json == "":
            arcpy.AddError("Layer JSON for Quick report must be provided.")
            return
        pdf_path = validate_quick_report(
            web_map_as_json, quick_summary_json, area_of_interest)
        if not pdf_path:
            return
        else:
            #   Set Quick PDF Report File path as output parameter
            arcpy.SetParameter(10, pdf_path)

if __name__ == '__main__':
    main()
