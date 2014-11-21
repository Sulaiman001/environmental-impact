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

#   Style for the Headers in th begining of report
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

STYLES.add(ParagraphStyle(name='noDataaStyle', alignment=TA_LEFT,
                          fontSize=10, fontName='Helvetica'))

#   Specify Page width and height
PAGE_HEIGHT = defaultPageSize[1]
PAGE_WIDTH = defaultPageSize[0]

#   Report format
DETAIL_REPORT_TYPE = "Detailed"
QUICK_REPORT_TYPE = "Quick"

REPORT_FORMAT = arcpy.GetParameterAsText(2)

#   Specify logo image path
LOGO_URL = arcpy.GetParameterAsText(8)

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
        #   Check the Report units type and set the Output Units
        if report_units.upper() == "Metric".upper():
            area_unit = ["esriSquareKilometers", "SqKm"]
        else:
            area_unit = ["esriAcres", "Acres"]

        aoi_fesatureset = arcpy.FeatureSet()
        aoi_fesatureset.load(area_of_interest)
        area_of_interest = convert(json.loads(aoi_fesatureset.JSON))

        #   Find out Spatial Reference and rings of provided AOI and caculate
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

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during calculate_area:" + str(error))
        return False

    except Exception as error:
        arcpy.AddError("Error occured during calculate_area:" + str(error))
        return False

def convert(data):
    """
    Removes the unicode characters from the dict
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
        # Setting parametrs for Export web map server
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
        arcpy.AddError("Error occured during create_image_to_print:" +
                       str(error))
        return False

    except Exception as error:
        arcpy.AddError("Error occured during create_image_to_print:" +
                       str(error))
        return False


def validate_detailed_report(web_map_as_json, area_of_interest, uploaded_zip,
                             report_units, detailed_fields):
    """This function helps to validate input parameters for detailed report type
    """
    aoi_area = ""
    image = ""
    zip_dir_path = ""

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

    #   If shapefile is uploaded, perform analysis for it
    if uploaded_zip != "":
        arcpy.AddMessage("Zip file provided.")
        zip_dir_path = extract_zip(uploaded_zip)

    #   Get Analysis data of all provided layers
    all_layers_data, fields_data = intersect_layers(
        detailed_fields, area_of_interest, report_units, zip_dir_path)

    #   Generate PDF using all generated data after analysis
    pdf_path = generate_pdf(image, all_layers_data, fields_data,
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

    except (zipfile.BadZipfile) as error:
        arcpy.AddError("Error occured during extracting zip file:" + str(error))
        sys.exit()

def intersect_layers(detailed_fields, area_of_interest, report_units,
                     zip_dir_path):
    """
    This function helps to intersect layers from json and shapefiles
    """
    all_layers_data = []
    #   Check for report type provided, and set the output Units
    if report_units.upper() == "METRIC":
        area_unit = 'Area(SqKm)'
        length_unit = 'Length(Meter)'
    elif report_units.upper() == "STANDARD":
        area_unit = 'Area(Acres)'
        length_unit = 'Length(Miles)'

    #   Set all layers table header
    all_layers_data.append(["Name", "Impact", "Count", area_unit,
                            length_unit])
    all_layer_fields_data = []
    fields_data = []

    arcpy.AddMessage("Clipping layers and its features...")
    layers_keys = detailed_fields.keys()
    #   loop through all layers in mxd for Detailed report
    for lyr in layers_keys:
        arcpy.AddMessage("Clipping '{0}' ...".format(lyr))
        arcpy.AddMessage("Fields provided : {0}"
                         .format(str(detailed_fields[lyr])))
        try:
            data_type = arcpy.Describe(lyr).DataType.lower()
            #   Include only Feature layerfor analysis
            if data_type == "featurelayer":
                lyr_fields = detailed_fields[lyr]
                if not isinstance(lyr_fields, dict):
                    raise Exception("Please check the format of Report Fields.")
                layer_details = [Paragraph(lyr, STYLEBODYTEXT)]

                #   Get information for each layer
                layer_data, all_layer_fields_data = intersect(
                    lyr_fields, lyr, area_of_interest, area_unit, length_unit,
                    report_units, False)
                for feat in layer_data:
                    layer_details.append(feat)

                #   Include each layer data in All layer table
                all_layers_data.append(layer_details)
                #   Include each field data in table for each layer
                fields_data.append(all_layer_fields_data)
            else:
                arcpy.AddWarning("Layer is not a feature layer")
                arcpy.AddWarning("Skipping {0}".format(lyr))
        except IOError:
            arcpy.AddError("{0} is not a valid layer. Please check the name"
                           .format(lyr))
        except Exception as error:
            arcpy.AddError("Error occurred for {0} layer. \n Error : {1}"
                           .format(lyr, str(error)))

    #   If shapefile is uploaded perform analysis for it
    if zip_dir_path != "":
        for shape_file in os.listdir(zip_dir_path):
            if shape_file.endswith(".shp"):
                arcpy.AddMessage("Clipping {0} layer...".format(shape_file))
                layer_details = [Paragraph(shape_file[:-4], STYLEBODYTEXT)]
                out_feature = arcpy.FeatureSet()
                out_feature.load(zip_dir_path + os.path.sep + shape_file)
                desc = arcpy.Describe(out_feature)
                fields = desc.fields
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
                #   Get information for each layer
                layer_data, all_layer_fields_data = intersect(
                    lyr_fields, out_feature, area_of_interest, area_unit,
                    length_unit, report_units, True)
                for feat in layer_data:
                    layer_details.append(feat)

                #   Include each layer data in All layer table
                all_layers_data.append(layer_details)

                #   Include each field data in table for each layer
                fields_data.append(all_layer_fields_data)
                break

    return all_layers_data, fields_data

def intersect(*args):
    """This function helps to to tabulate intersection analysis on features."""
    lyr_fields, out_feature, area_of_interest = args[0], args[1], args[2]
    area_unit, length_unit, report_units = args[3], args[4], args[5]
    is_zip = args[6] #   Checks if zip file is sent
    layer_data = []
    all_layer_fields_data = []

    #   Set Output units based on Geometry type of layer
    desc = arcpy.Describe(out_feature)
    feature_type = desc.shapeType
    if feature_type.upper() == "POINT":
        output_unit = "UNKNOWN"
    if feature_type.upper() == "POLYGON":
        if report_units.upper() == "METRIC":
            output_unit = "SQUARE_KILOMETERS"
        elif report_units.upper() == "STANDARD":
            output_unit = "ACRES"
    if feature_type.upper() == "POLYLINE":
        if report_units.upper() == "METRIC":
            output_unit = "METERS"
        elif report_units.upper() == "STANDARD":
            output_unit = "MILES"

    tbl_name = str(desc.name)
    sumtablepath = (SCRATCH + os.sep +
                    tbl_name.replace(" ", "") + "_sumtable.dbf")
    lyr_fields_names = lyr_fields.keys()

    #   Set Object ID field of Area of Interest as class field for
    #   Tabulate Intersection
    zone_field = arcpy.Describe(area_of_interest).OIDFieldName
    try:
        #   Perform Tabulate Intersection
        layer_intersect = arcpy.TabulateIntersection_analysis(
            area_of_interest, zone_field, out_feature, sumtablepath,
            lyr_fields_names, "", "", output_unit)

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error while performing intersection")
        arcpy.AddError(str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error while performing intersection.")
        arcpy.AddError(str(error))
        sys.exit()

    #   If any feature found after Tabulate intersection, means the layer has
    #   some impact on provided AOI else No Known Impact
    if int(arcpy.GetCount_management(layer_intersect)[0]) != 0:
        impact_status = "Potential Impact"
        search_cursor = arcpy.da.SearchCursor(layer_intersect, ["*"])
        impact_value = 0
        for row in search_cursor:
            impact_value = impact_value + row[-2]

    elif int(arcpy.GetCount_management(layer_intersect)[0]) == 0:
        impact_status = "No Known Impact"
        impact_value = 0

    #   If layer has Impact, get the details for each of the required field
    all_fields_data = append_data(out_feature, layer_intersect, lyr_fields,
                                  area_unit, length_unit, is_zip)
    all_layer_fields_data.append(all_fields_data)
    #   Include Imapct status in layer details table
    layer_data.append(impact_status)

    #   If layer is of point type, insert value in COUNT column of table
    if feature_type.upper() == "POINT":
        if impact_value == 0:
            count = "0"
        else:
            count = str(format(impact_value, '8,d'))

        layer_data.append(Paragraph(count, STYLES['Right']))
        layer_data.append(Paragraph("0", STYLES['Right']))
        layer_data.append(Paragraph("0", STYLES['Right']))

    #   If layer is of point type, insert value in AREA column of table
    if feature_type.upper() == "POLYGON":
        if impact_value == 0:
            area = "0"
        else:
            area = "{:,}".format(round(impact_value, 2))
        layer_data.append(Paragraph("0", STYLES['Right']))
        layer_data.append(Paragraph(area, STYLES['Right']))
        layer_data.append(Paragraph("0", STYLES['Right']))

    #   If layer is of point type, insert value in LENGTH column of table
    if feature_type.upper() == "POLYLINE":
        if impact_value == 0:
            length = "0"
        else:
            length = "{:,}".format(round(impact_value, 2))
        layer_data.append(Paragraph("0", STYLES['Right']))
        layer_data.append(Paragraph("0", STYLES['Right']))
        layer_data.append(Paragraph(length, STYLES['Right']))

    return  layer_data, all_layer_fields_data

def append_data(*args):
    """
    This function helps to append data on created lists in this fucntion to
    maintain table format in PDF
    """
    try:
        out_feature, layer_intersect = args[0], args[1]
        lyr_fields, area_unit = args[2], args[3]
        length_unit, is_zip = args[4], args[5]
        #   Maintained list to hold fields data
        all_fields_data = []
        desc = arcpy.Describe(out_feature)
        if is_zip:
            layer_name = desc.name[:-4]
        else:
            layer_name = str(out_feature)

        all_fields_data.append([layer_name, "", ""])

        #   Appending empty list of fields in the main layer list which dont
        #   impact in the provided AOI. Latre while building pdf the string will
        #   be shown below the layer name describing " No known Impact "
        if int(arcpy.GetCount_management(layer_intersect)[0]) == 0:
            all_fields_data.append(["No known impact."])

        elif int(arcpy.GetCount_management(layer_intersect)[0]) != 0:
            valid_fields = 0
            #   Add detailes of each of layer in table
            for fld in arcpy.ListFields(layer_intersect):
                #   Consider only required fields
                exclude_list = ["OBJECTID", "FID", "AREA", "LENGTH",
                                "PNT_COUNT", "PERCENTAGE", "FID_", "OID",
                                "OBJECTID_1"]
                if fld.name.upper() not in exclude_list:
                    valid_fields += 1
                    field_values = []
                    #   Take value of field from attribute table
                    with arcpy.da.SearchCursor(layer_intersect, [fld.name]) \
                            as search_cursor:
                        for row in search_cursor:
                            field_values.append(row[0])

                    feature_type = desc.shapeType
                    #   Set field table header baced on Geometry type of layer

                    if feature_type.upper() == "POINT":
                        sum_field = "PNT_COUNT"
                        field_header = [lyr_fields[fld.name], "COUNT"]
                    elif feature_type.upper() == "POLYGON":
                        sum_field = "AREA"
                        field_header = [lyr_fields[fld.name], area_unit]
                    elif feature_type.upper() == "POLYLINE":
                        sum_field = "LENGTH"
                        field_header = [lyr_fields[fld.name], length_unit]

                    field_data = []
                    #   Add Header to field data table
                    field_data.append(field_header)

                    unique_fieldvalue = list(set(field_values))
                    unique_fieldvalue.sort()

                    #   Add each unique value details into field data table
                    for value in unique_fieldvalue:
                        total_count = 0
                        values = []
                        #   Insert value in field data table
                        values.append(Paragraph(str(value), STYLEBODYTEXT))
                        sum_val = 0
                        #   If Point type, insert the count,
                        #   if Polygon type, insert area
                        #   if polyline type, insert length
                        with arcpy.da.SearchCursor(layer_intersect,
                                                   [fld.name, sum_field]) \
                                                   as cursor:
                            for row in cursor:
                                row_value = row[1]
                                total_count = total_count + row_value
                                if row[0] == value:
                                    sum_val = (sum_val + row_value)
                                    if feature_type.upper() == "POINT":
                                        val = format(sum_val, '8,d')
                                    else:
                                        val = "{:,}".format(round(sum_val, 2))
                                if feature_type.upper() == "POINT":
                                    total = total_count
                                else:
                                    total = "{:,}".format(round(total_count, 2))
                            para_val = (Paragraph(str(val), STYLES['Right']))
                            values.append(para_val)

                            field_data.append(values)
                    #   Insert total of all values for field in total section of
                    #   field data table
                    para_total = Paragraph(str(total), STYLES['header_right'])
                    field_data.append(["Total", para_total])
                    #   insert each field data in all fields details
                    all_fields_data.append(field_data)

            if valid_fields == 0:
                no_fields_msg = ("There is known impact, but no fields are" +
                                 " provided to summarize.")
                all_fields_data.append([no_fields_msg])

        return all_fields_data


    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during append_data:" + str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occured during append_data:" + str(error))
        sys.exit()

def generate_pdf(image, all_layers_data, fields_data, area, quick_json):
    """
    This function helps to genrate PDF report for quick summary report and
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

        heading1 = "Area of Interest (AOI) Information"
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
            #   Build Detailed PDF Reoprt if report type is Detailed
            arcpy.AddMessage("Building PDF for {0}.".format(REPORT_FORMAT))
            heading4 = "Summary of Impact"
            parts.append(Paragraph(heading4, STYLES["HeadingLeft"]))
            parts.append(Spacer(0.20, 0.20 * inch))

            #   Insert All layers table in PDF doc
            tbl = Table(all_layers_data, vAlign='TOP',
                        colWidths=[5.0*cm, 3.2*cm, 2*cm, 2.6*cm,
                                   2.7*cm],
                        style=[('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                               ('FONT', (0, 0), (4, 0), 'Helvetica-Bold', 10),
                               ('VALIGN', (0, 1), (-1, -1), 'TOP'),
                               ('ALIGN', (2, 0), (4, -1), 'RIGHT'),
                               ('ALIGN', (0, 0), (1, -1), 'LEFT'),
                               ('BACKGROUND', (0, 0), (4, 0), colors.lavender)])
            parts.append(Spacer(0.20, 0.20 * inch))
            parts.append(tbl)

            #   Insert tables for each field for each layer having impact
            for i in xrange(len(fields_data)):
                if len(fields_data[i]) > 0:
                    lyr_name = fields_data[i][0][0][0] +" - Impact Information"
                    parts.append(Spacer(0.35, 0.35 * inch))
                    parts.append(Paragraph(lyr_name, STYLES["HeadingLeft"]))
                    parts.append(Spacer(0.20, 0.20 * inch))

                    if isinstance(fields_data[i][0][1][0], str):
                        no_impact_para = Paragraph(fields_data[i][0][1][0],
                                                   STYLES['noDataaStyle'])
                        parts.append(no_impact_para)
                    else:
                        for j in xrange(1, len(fields_data[i][0])):
                            field_value_table = Table(
                                fields_data[i][0][j],
                                style=[('GRID', (0, 0), (-1, -1), 0.5,
                                        colors.black),
                                       ('FONT', (0, 0), (1, 0),
                                        'Helvetica-Bold', 10),
                                       ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                                       ('BACKGROUND', (0, 0), (1, 0),
                                        colors.lavender),
                                       ('FONT', (0, -1), (1, -1),
                                        'Helvetica-Bold', 10),
                                       ('ALIGN', (1, -1), (1, -1), 'RIGHT')],
                                colWidths=(5.1*inch, 1*inch))
                            parts.append(Spacer(0.20, 0.20 * inch))
                            parts.append(field_value_table)


        if REPORT_FORMAT == QUICK_REPORT_TYPE:
            #   Build Quick PDF Reoprt if report type is Quick
            arcpy.AddMessage("Building PDF for {0}.".format(REPORT_FORMAT))
            parts = get_quick_report_data(parts, quick_json)

        #   Build the PDF doc
        doc.build(parts, onFirstPage=on_first_page, onLaterPages=on_later_pages,
                  canvasmaker=NumberedCanvas)

        arcpy.AddMessage("PDF is created at: " + pdf_name)
        return pdf_name

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during generate_pdf:" + str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occured during generate_pdf:" + str(error))
        sys.exit()

def get_quick_report_data(parts, quick_json):
    """ This function generated the table to be included in PDF doc for Quick
    type"""
    #   Maintaine dict for settign header of tables
    unit_dict = {"standard" : {"area" : "Area(acres)",
                               "length" : "Length(Miles)",
                               "count" : "Count"},
                 "metric" : {"area": "Area(SqKm)",
                             "length" : "Length(Meter)",
                             "count" : "Count"},
                 "" : {"area" : "Area(acres)",
                       "length" : "Length(Miles)",
                       "count" : "Count"}}
    #   Insert details of each layer
    try:
        #   Insert Summary Table
        parts.append(Spacer(0.20, 0.20 * inch))
        parts.append(Paragraph("Summary of Impact", STYLES["HeadingLeft"]))
        parts.append(Spacer(0.20, 0.20 * inch))

        summary_list = []
        summary_header = ["Name", "Impact", "Count"]
        #   Insert headers of summary tables as per unit type provided
        for layer_item in quick_json:
            if layer_item["summaryType"].upper() in ["AREA", "LENGTH"]:
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
                layer_list += ["No known Impact", "0", "0", "0"]
            else:
                if layer_item["summaryFields"] == []:
                    layer_list += ["Known Impact", "0", "0", "0"]
                else:
                    field_value_total = 0
                    for field in layer_item["summaryFields"][0]["fieldValues"]:
                        field_value_total += field[field.keys()[0]]
                    if layer_item["summaryType"].upper() == "COUNT":
                        impact_value = Paragraph(str(format(field_value_total,
                                                            '8,d')),
                                                 STYLES['Right'])
                        layer_list += ["Known Impact", impact_value, "0", "0"]
                    elif layer_item["summaryType"].upper() == "AREA":
                        value = "{:,}".format(round(field_value_total, 2))
                        impact_value = Paragraph(value, STYLES['Right'])
                        layer_list += ["Known Impact", "0", impact_value, "0"]
                    elif layer_item["summaryType"].upper() == "LENGTH":
                        value = "{:,}".format(round(field_value_total, 2))
                        impact_value = Paragraph(value, STYLES['Right'])
                        layer_list += ["Known Impact", "0", "0", impact_value]

            summary_list.append(layer_list)

        summary_table = Table(
            summary_list, vAlign='TOP', colWidths=[5.0*cm, 3.2*cm, 2*cm, 2.7*cm,
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
            #   Insert Layer name header
            lyr_name = quick_json[i]["layerName"] + " - Impact Information"
            arcpy.AddMessage("Processing : " + lyr_name)
            parts.append(Spacer(0.20, 0.20 * inch))
            parts.append(Paragraph(lyr_name, STYLES["HeadingLeft"]))
            parts.append(Spacer(0.10, 0.10 * inch))
            #   Insert fields data in table

            if quick_json[i]["summaryType"] != "":
                if len(quick_json[i]["summaryFields"]) > 0:
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
                                if u_type in ["area", "length"]:
                                    val = "{:,}".format(round(the_value, 2))
                                else:
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
                        #   Insert field value table for each field in mai PDF
                        parts.append(field_value_table)
                elif len(quick_json[i]["summaryFields"]) == 0:
                    no_field_msg = "No fields specified for analysis"
                    no_fields_para = Paragraph(no_field_msg,
                                               STYLES['noDataaStyle'])
                    parts.append(Spacer(0.10, 0.10 * inch))
                    parts.append(no_fields_para)

            elif quick_json[i]["summaryType"] == "":
                no_impact_para = Paragraph("No known Impact",
                                           STYLES['noDataaStyle'])
                parts.append(Spacer(0.10, 0.10 * inch))
                parts.append(no_impact_para)

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
    canvas.drawString(PAGE_WIDTH - 211, PAGE_HEIGHT - 105, doc_date)
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
        arcpy.AddError("Error occured during validate_quick_report:" +
                       str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occured during validate_quick_report:" +
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

    #   Check if valid AOI is provided. It should have atleast 1 polygon feature
    aoi_featset = arcpy.FeatureSet()
    aoi_featset.load(area_of_interest)
    aoi_feat_count = int(arcpy.GetCount_management(aoi_featset)[0])


    if aoi_feat_count == 0:
        arcpy.AddError("Provided AOI has no polygon features." +
                       " Please provide valid AOI for analysis.")
        return

    #   Generate PDF for Detailed type
    if REPORT_FORMAT == DETAIL_REPORT_TYPE:
        if quick_summary_json != "":
            arcpy.AddMessage("***Quick summary json is provided for detailed" +
                             " report which is not required.")

        #   Report units are required for Detailed Report type
        if report_units == "":
            arcpy.AddError("Reoprt Units must be provided.")
            return

        if detailed_fields == "":
            arcpy.AddError("Fields must be provided to generate detailed " +
                           "report.")
            return

        field_unicode_json = json.loads(detailed_fields)
        detailed_fields = convert(field_unicode_json)

        #   Variable "layers_to_analyze" previously used as 3rd argument for
        #   refering to mxd layers.
        pdf_path = validate_detailed_report(
            web_map_as_json, area_of_interest, uploaded_zip,
            report_units, detailed_fields)
        if not pdf_path:
            return
        else:
            #   Set Detailed PDF Report File path as output parameter
            arcpy.SetParameter(9, pdf_path)

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
            arcpy.SetParameter(9, pdf_path)

if __name__ == '__main__':
    main()

