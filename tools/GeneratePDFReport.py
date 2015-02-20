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

import arcpy, os, zipfile, time, sys, json, urllib2, urllib, collections, shutil
import base64
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
SCRATCH_GDB = arcpy.env.scratchGDB

#   Geometry Service to calculate area of input AOI
GEOMETRY_SERVICE_INSTANCE = "http://tasks.arcgisonline.com/ArcGIS/rest/services"
GEOMETRY_SERVICE_TASK = "/Geometry/GeometryServer/areasAndLengths"
GEOMTRY_SERVICE_URL = GEOMETRY_SERVICE_INSTANCE + GEOMETRY_SERVICE_TASK

#   Styles for elements of the table as required
STYLES = getSampleStyleSheet()

#   Style for normal text in table cell and Incorrect field message
STYLEBODYTEXT = STYLES["BodyText"]
STYLEBODYTEXT.wordWrap = 'CJK'

#   Style for Summary table header and Layer Name header
STYLEHEADING = STYLES["Heading1"]
STYLEHEADING.wordWrap = 'CJK'
STYLEHEADING.alignment = TA_LEFT
STYLEHEADING.fontName = 'Helvetica-Bold'
STYLEHEADING.textColor = 'cornflowerblue'
STYLEHEADING.fontSize = 12
STYLEHEADING.spaceBefore = 0
STYLEHEADING.spaceAfter = 0

#   Style for PDF Subtitle
STYLESUBTITLE = STYLES["Heading4"]
STYLESUBTITLE.wordWrap = 'CJK'
STYLESUBTITLE.alignment = TA_LEFT
STYLESUBTITLE.fontName = 'Helvetica-Bold'
STYLESUBTITLE.textColor = 'cornflowerblue'
STYLESUBTITLE.spaceBefore = 0
STYLESUBTITLE.spaceAfter = 0
STYLESUBTITLE.leading = 18
STYLESUBTITLE.fontSize = 12

#   Style for Layer's table headers except sum column in quick report
STYLETABLEHEADERS = STYLES["Heading2"]
STYLETABLEHEADERS.wordWrap = 'CJK'
STYLETABLEHEADERS.fontName = 'Helvetica-Bold'
STYLETABLEHEADERS.fontSize = 10
STYLETABLEHEADERS.spaceBefore = 18
STYLETABLEHEADERS.spaceAfter = 18
STYLETABLEHEADERS.leading = 13

#   Style for sum column in quick report
STYLETABLEHEADERSRIGTH = STYLES["Heading3"]
STYLETABLEHEADERSRIGTH.wordWrap = 'CJK'
STYLETABLEHEADERSRIGTH.fontName = 'Helvetica-Bold'
STYLETABLEHEADERSRIGTH.fontSize = 10
STYLETABLEHEADERSRIGTH.alignment = TA_RIGHT
STYLETABLEHEADERSRIGTH.spaceBefore = 18
STYLETABLEHEADERSRIGTH.spaceAfter = 18
STYLETABLEHEADERSRIGTH.leading = 13


#   Style for count, area, length values in all tables
STYLES.add(ParagraphStyle(name='Right', alignment=TA_RIGHT,
                          fontName='Helvetica', wordWrap='CJK'))

#   Style for displaying error for Image not displayed
STYLES.add(ParagraphStyle(name='error-left', alignment=TA_LEFT,
                          fontName='Helvetica', fontSize=8,
                          textColor=colors.red))

#   Style for showing Area of AOI value
STYLES.add(ParagraphStyle(name='areaStyle', alignment=TA_LEFT, fontSize=12,
                          fontName='Helvetica'))

#   Specify Page width and height
PAGE_HEIGHT = defaultPageSize[1]
PAGE_WIDTH = defaultPageSize[0]

#   Report format
DETAIL_REPORT_TYPE = "DETAILED"
QUICK_REPORT_TYPE = "QUICK"

REPORT_FORMAT = arcpy.GetParameterAsText(2).upper()

#   Specify logo image path
LOGO_URL = arcpy.GetParameterAsText(8)

#   Specify Subtitle for the report
REPORT_SUBTITLE = arcpy.GetParameterAsText(9) or \
                   "Area of Interest (AOI) Information"

#   Character limit for Subtitle String
SUBTITLE_CHAR_LIMIT = 150

#   Specify message to be shown when no fields are provided to summurized
NO_FIELDS_MSG = ("* There is known impact, but no fields are provided to" +
                 " summarize.")

#   Specify message to be shown when any incorrect fields are provided
#    to summurized
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

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occurred while printing image :" + str(error))
        return False

    except Exception as error:
        arcpy.AddError("Error occurred while printing image :" + str(error))
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

def extract_zip(zip_path):
    """ This function extracts the zip file in scratch workspace. """
    try:
        #   Extract the zip file to SCRATCH workspace
        with zipfile.ZipFile(zip_path, "r") as zip_file:
            for name in zip_file.namelist():
                file_name = os.path.basename(name)
                source = zip_file.open(name)
                target = file(os.path.join(SCRATCH, file_name), "wb")
                with source, target:
                    shutil.copyfileobj(source, target)
                #   Get the shapefile name
                if file_name.endswith(".shp"):
                    shape_file_name = target.name
        return os.path.join(SCRATCH, shape_file_name)

    except (zipfile.BadZipfile) as error:
        arcpy.AddError("ERROR occurred while extracting ZIP : " + str(error))
        return False


def clip_layers(detailed_fields, area_of_interest, report_units, zip_file_path):
    """ This fucntion sends the valid layers and also valis shapefile from
    uploaded zip for Clip ans Statistic Analysis """
    #   Check for report type provided, and set the output Units and build the
    #   expression required for CalculateField operation
    if report_units.upper() == "METRIC":
        area_unit = 'Area(SqKm)'
        length_unit = 'Length(Km)'
        area_calc_expression = "!SHAPE.AREA@SQUAREKILOMETERS!"
        length_calc_expression = "!SHAPE.LENGTH@KILOMETERS!"
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
        data_type = arcpy.Describe(lyr_object["LayerTitle"]).DataType.upper()
        shape_type = arcpy.Describe(lyr_object["LayerTitle"]).shapeType.upper()


        #   Include only Feature layer for analysis
        if data_type.upper() == "FEATURELAYER":
            arcpy.AddMessage("Clipping '{0}' ...".\
                             format(lyr_object["LayerTitle"]))

            lyr_fields = lyr_object["DetailSummaryReportFields"]
            arcpy.AddMessage("Fields provided : {0}".format(lyr_fields.keys()))

            # Get the table generated after StatisticAnalysis and also
            #   individual layer details
            out_stat_tbl, lyr_summary_info, invalid_fields = get_stat_table(
                lyr_object, area_of_interest, lyr_fields.keys(),
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
            ind_lyr_tables[lyr_object["SearchDisplayTitle"]] = layer_tables_data
            all_layers_data.append(ind_lyr_tables)
            summary_data += [lyr_summary_info]

    #   If shapefile is uploaded perform analysis for it
    if zip_file_path != "":
        shape_file_path = extract_zip(zip_file_path)
        shape_file_name = os.path.basename(shape_file_path)[:-4]
        ind_lyr_tables = {}
        arcpy.AddMessage("Clipping {0} layer...".format(shape_file_name))

        shape_type = arcpy.Describe(shape_file_path).shapeType.upper()

        #   Exclude the not required fields from statistic
        fields = arcpy.Describe(shape_file_path).fields
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
            shape_file_path, area_of_interest, lyr_fields.keys(),
            statistic_field[shape_type], shape_file_name)

        #   If Layer dont have impact in AOI, directly append the
        #   details to summary table
        if not out_stat_tbl:
            summary_data += [lyr_summary_info]
        else:
            #   If shapefile is having impact in AOI, get the details
            layer_tables_data = get_layer_table_data(
                out_stat_tbl, lyr_fields, statistic_field[shape_type],
                invalid_fields)

            ind_lyr_tables[shape_file_name] = layer_tables_data
            all_layers_data.append(ind_lyr_tables)
            summary_data += [lyr_summary_info]


    return summary_data, all_layers_data


def get_stat_table(lyr, area_of_interest, lyr_fields, shape_type, shp_name):
    """ This function performs the Clip Analysis on the providede layer.
    If any feature intersects the AOI, it performs statistic analysis using
    provided fields. It stores the layer's information for Summary Table. """
    #   Get the name of the layer/shapefile
    if shp_name:
        layer_name = display_name = shp_name
        in_features = lyr
    else:
        layer_name = in_features = lyr["LayerTitle"]
        display_name = lyr["SearchDisplayTitle"]


    lyr_summary_info = [Paragraph(display_name, STYLEBODYTEXT)]

    #   Validate the name of output feature class after clip analysis
    valid_out_feature_name = arcpy.ValidateTableName(
        layer_name.replace(" ", ""), SCRATCH_GDB)

    out_features = os.path.join(SCRATCH_GDB, valid_out_feature_name)
    arcpy.Clip_analysis(in_features, area_of_interest, out_features)
    layer_summary_data = {}
    #   If clipped feature class has some features then performs Statistic
    #   analysis on provided fields
    if int(arcpy.GetCount_management(out_features)[0]) > 0:
        lyr_summary_info += ["Potential Impact", "0", "0", "0"]

        #   Add field to the output feature class to store calculated area
        if arcpy.Describe(in_features).shapeType.upper() in \
                ["POLYGON", "POLYLINE"]:
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

        valid_table_name = arcpy.ValidateTableName((layer_name.\
                           replace(" ", "") + "_stat"), r"in_memory")
        out_stat_table = os.path.join(r"in_memory", valid_table_name)
        arcpy.Statistics_analysis(out_features, out_stat_table,
                                  [[new_field_name, "SUM"]], valid_fields)

        #   Get the field added by Statistic analysis which is used for summary
        sum_field = [field.name for field in arcpy.ListFields(out_stat_table) \
                     if field.name != arcpy.Describe(out_stat_table)\
                     .OIDFieldName and field.name.upper() in \
                     ("SUM_" + new_field_name).upper()][0]

        #   For point feature class, copy the FREQUENCY values in "Count" field
        if arcpy.Describe(in_features).shapeType.upper() == "POINT":
            arcpy.DeleteField_management(out_stat_table, sum_field)
            arcpy.AddField_management(out_stat_table, "Count")
            arcpy.CalculateField_management(out_stat_table, 'Count',
                                            '!FREQUENCY!', "PYTHON_9.3")
            sum_field = 'Count'

        #   Delete the FREQUENCY from output table
        arcpy.DeleteField_management(out_stat_table, 'FREQUENCY')

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
        #lyr_summary_info[shape_type[0]] = [impact_value]
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

    end_index = start_index + column_limit
    while continue_process:
        field_values = []
        with arcpy.da.SearchCursor(out_stat_table,
                                   stat_fields[start_index:end_index]) \
                                   as s_cursor:
            #   Add the layers to the tables
            field_headers = ["#"]
            for i in xrange(len(stat_fields[start_index:end_index])):
                try:
                    value = lyr_fields[stat_fields[start_index:end_index][i]]
                    header_para = Paragraph(str(value), STYLETABLEHEADERS)
                    field_headers += [header_para]
                except IndexError:
                    continue
                except KeyError:
                    header_para = Paragraph(str(sum_value_header[2]),
                                            STYLETABLEHEADERS)
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

        start_index = end_index
        if start_index >= len(stat_fields):
            continue_process = False
        else:
            end_index = start_index + column_limit
            if end_index > len(stat_fields):
                end_index = len(stat_fields)

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
        doc.topMargin = 83

        #   Specify height and width for Layout
        height = 8.50 * inch
        width = 6.35 * inch

        parts = []
        if len(REPORT_SUBTITLE) > SUBTITLE_CHAR_LIMIT:
            subtitle_para = Paragraph(REPORT_SUBTITLE[:SUBTITLE_CHAR_LIMIT],
                                      STYLESUBTITLE)
        else:
            subtitle_para = Paragraph(REPORT_SUBTITLE, STYLESUBTITLE)
        parts.append(subtitle_para)
        #parts.append(Spacer(0.60, 0.60 * inch))
        parts.append(Paragraph("Area: " + str(area), STYLES["areaStyle"]))
        parts.append(Spacer(0.10, 0.10* inch))

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
            parts.append(Paragraph("Summary of Impact", STYLEHEADING))
            parts.append(Spacer(0.20, 0.20 * inch))
            # Summary table
            tbl = Table(summary_data, hAlign='LEFT',
                        colWidths=[5.0*cm, 3.4*cm, 2*cm, 2.6*cm, 2.6*cm],
                        style=[('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                               ('FONT', (0, 0), (-1, 0), 'Helvetica-Bold', 10),
                               ('VALIGN', (0, 1), (-1, -1), 'TOP'),
                               ('ALIGN', (2, 0), (4, -1), 'RIGHT'),
                               ('ALIGN', (0, 0), (1, -1), 'LEFT'),
                               ('BACKGROUND', (0, 0), (4, 0), colors.lavender)])
            #parts.append(Spacer(0.20, 0.20 * inch))
            parts.append(tbl)
            #parts.append(Spacer(0.20, 0.20 * inch))

            # Individual Layers Table
            for layer_details in all_layers_data:
                parts.append(Spacer(0.30, 0.30 * inch))
                layer_heading = (str(layer_details.keys()[0]) +
                                 " - Impact Information")
                parts.append(Paragraph(layer_heading, STYLEHEADING))
                #parts.append(Spacer(0.20, 0.20 * inch))

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
                    no_impact_para = Paragraph(val, STYLEBODYTEXT)
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
                             "length" : "Length(Km)",
                             "count" : "Count"},
                 "" : {"area" : "Area(acres)",
                       "length" : "Length(Miles)",
                       "count" : "Count"}}
    try:
        #   Insert Summary Table
        #parts.append(Spacer(0.20, 0.20 * inch))
        parts.append(Paragraph("Summary of Potential Impact",
                               STYLEHEADING))
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
                        layer_list += ["Potential Impact", impact_value, "0",
                                       "0"]

                    elif layer_item["summaryType"].upper() == "AREA":
                        layer_list += ["Potential Impact", "0", impact_value,
                                       "0"]

                    elif layer_item["summaryType"].upper() == "LENGTH":
                        layer_list += ["Potential Impact", "0", "0",
                                       impact_value]

            summary_list.append(layer_list)

        summary_table = Table(
            summary_list, vAlign='TOP', colWidths=[5.0*cm, 3.4*cm, 2*cm, 2.6*cm,
                                                   2.6*cm],
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
                lyr_name = (quick_json[i]["layerName"] +
                            " - Potential Impact Information")

                parts.append(Spacer(0.23, 0.23 * inch))
                parts.append(Paragraph(lyr_name, STYLEHEADING))
                #parts.append(Spacer(0.08, 0.08* inch))
                if len(quick_json[i]["summaryFields"]) > 0:
                    #   Insert fields data in table
                    for fields in quick_json[i]["summaryFields"]:
                        unit = quick_json[i]['summaryUnits'].lower()
                        u_type = quick_json[i]['summaryType'].lower()
                        field_header_unit = unit_dict[unit][u_type]
                        field_header = [Paragraph(fields['fieldName'],
                                                  STYLETABLEHEADERS),
                                        Paragraph(field_header_unit,
                                                  STYLETABLEHEADERSRIGTH)]
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
                                field_key = Paragraph(the_key, STYLEBODYTEXT)
                                value = [field_key, impact_val]
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
                    no_fields_para = Paragraph(NO_FIELDS_MSG, STYLEBODYTEXT)
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
    canvas.setFont("Helvetica", 11)
    canvas.drawString(PAGE_WIDTH - 192, PAGE_HEIGHT - 85, doc_date)

##    string_list = []
##    start_index = 0
##    limit = 75
##    end_index = start_index + limit
##
##    batches = len(REPORT_SUBTITLE) / limit
##    if len(REPORT_SUBTITLE) % limit > 0:
##        batches += 1
##
##    for _ in xrange(batches):
##        string_list.append(REPORT_SUBTITLE[start_index:end_index])
##        start_index = end_index
##        end_index = start_index + limit
##        if end_index > len(REPORT_SUBTITLE):
##            end_index = len(REPORT_SUBTITLE)
##
##    print string_list
##
##    canvas.setFont("Helvetica-Bold", 13)
##    canvas.setFillColor("cornflowerblue")
##
##    text_y = doc.bottomMargin + 670
##
##    if len(string_list) > 2:
##        string_list = string_list[:2]
##    elif len(string_list) == 1:
##        string_list += [string_list[0]]
##        string_list[0] = " "
##        text_y = doc.bottomMargin + 680
##
##    arcpy.AddMessage(string_list)
##
##    for batch_string in string_list:
##        canvas.drawString(doc.leftMargin + 7, text_y, batch_string)
##        text_y -= 17

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
    logo_image_height = 35
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

    logo_image_width, imageheight = ImageReader(image).getSize()

    aspect_ratio = imageheight/(float(logo_image_width))
    reduceby = 0.1

    while logo_image_height <= imageheight:
        logo_image_width = logo_image_width - reduceby
        imageheight = logo_image_width*aspect_ratio
        reduceby += 0.1

    para = Paragraph('<font>' + title + '</font>', style_table, )
    _, para_height = para.wrap(
        (PAGE_WIDTH + 0.24*inch) - (logo_image_width + logo_header_gap),
        header_height)

    logo_y = ((para_height + imageheight) / 2) + header_top_padding

    # draw logo on header
    if image:
        canvas.drawImage(ImageReader(image), indent_right, PAGE_HEIGHT-logo_y,
                         logo_image_width, imageheight, mask='auto')
    para_y = para_height + header_top_padding
    # draw header text
    para.drawOn(canvas, (indent_right + logo_image_width + logo_header_gap),
                (PAGE_HEIGHT - para_y))
    canvas.setLineWidth(1)
    canvas.setStrokeColor(Color(0, 0.2627450980392157, 0.42745098039215684, 1))
    line_y = PAGE_HEIGHT - 70
    canvas.line(indent_right, line_y,
                (PAGE_WIDTH - indent_right) - 1, line_y)
#(indent_right + logo_image_width + logo_header_gap) - 3
    canvas.restoreState()


def get_image(image_url):
    """ Get a image from remote host """
    try:
        if len(image_url) > 0:
            return PILImage.open(StringIO(urllib.urlopen(image_url).read()))
        else:
            logo_base64 = b"""iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAGX
            RFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG
            9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cm
            VTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIH
            g6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi
            8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3
            d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdG
            lvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC
            8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLy
            IgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZX
            NvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2
            luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OUI3REI0QkNBNUVBMTFFM0
            E1NDM5RkMwMkZFMUMwQTgiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OUI3REI0Qk
            RBNUVBMTFFM0E1NDM5RkMwMkZFMUMwQTgiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZW
            Y6aW5zdGFuY2VJRD0ieG1wLmlpZDo5QjdEQjRCQUE1RUExMUUzQTU0MzlGQzAyRkUxQz
            BBOCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo5QjdEQjRCQkE1RUExMUUzQTU0Mz
            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
            CC"""

            image = StringIO(base64.decodestring(logo_base64))
            image.seek(0)
            logo_image = PILImage.open(image)
            return logo_image

    except Exception as error:
        arcpy.AddError("Error occurred while printing image." + str(error))
        sys.exit()

def validate_quick_report(web_map_as_json, quick_summary_json,
                          area_of_interest):
    """This function helps to validate input parameters for quick report type.
    """
    try:
        try:
            quick_summary_json = json.loads(quick_summary_json)
        except ValueError as error:
            raise Exception("Invalid JSON : " + str(error))

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

    detailed_fields = arcpy.GetParameterAsText(4)
    uploaded_zip = arcpy.GetParameterAsText(5)
    quick_summary_json = arcpy.GetParameterAsText(6).strip()
    report_units = arcpy.GetParameterAsText(7)

    #encoded_text = encode_text(REPORT_SUBTITLE)

    #   Check if valid AOI is provided. It should have at least 1 polygon
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

        try:
            field_unicode_json = json.loads(detailed_fields)
            detailed_fields = convert(field_unicode_json)
        except ValueError as error:
            arcpy.AddError("Invalid JSON : " + str(error))
            sys.exit()

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
