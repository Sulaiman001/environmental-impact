"""
#-------------------------------------------------------------------------------
# Name:        PDF Generator Tool
# Purpose:     This toolhelps to create 'Detailed Summary Report and
#              'Quick Summary Report' in PDF format.
#              Using this tool, user will be able to print map by providing
#              Web_Map_as_Json, calculate area of AOI which drawn on the web
#              application.
#              This tool helps to intersect area of interest with provided layer
#              json and included shapefiles for the analysis. and helps to
#              create detailed summary report of it that to export in PDF fromat
#              For Quick summary report, provide Web_Map_as_Json and json for
#              quick summary.
#              Layer json format should be as shown below:
#              [{"mxd_path": "D:\\Data\\EnvImpact.mxd",
                        "layerID": 0,
                        "fields": [
                            {
                                "name": "field1"
                            },
                            {
                                "name": "field2"
                            }]}]
#               for Quick summary json should be as shown below:
              [ {"layerName": "layer1",
                    "summaryType": "area",
                    "summaryUnits": "standard",
                    "summaryFields": [
                        {"fieldName": "field1",
                            "fieldValues": [
                                {"A": "342"},
                                {"B": "567"}
                            ]},
                        { "fieldName": "field2",
                            "fieldValues": [
                                {"X": "342"}
                            ]
                        }
                    ]
                },
                { "layerName": "layer2",
                    "summaryType": "length",
                    "summaryUnits": "standard",
                    "summaryFields": [
                        {"fieldName": "field1",
                            "fieldValues": [
                                {"P": "18"}
                            ] } ]
                },
                {"layerName": "layer3",
                    "summaryType": "count",
                    "summaryUnits": "standard",
                    "summaryFields": [
                        {"fieldName": "field1",
                            "fieldValues": [
                                {"CA": "2"},
                                {"SA": "3"}
                            ]
                        },
                        {"fieldName": "field2",
                            "fieldValues": [
                                {"SONO": "2"},
                                { "AMA": "3"}
                            ]
                        }
                    ]
                }
            ]

#
# Created:     09/05/2014
#-------------------------------------------------------------------------------
"""
#   pylint: disable = E1101, E1103

import arcpy, os, zipfile, time, sys, csv, json, urllib2, urllib, collections
from reportlab.lib.pagesizes import A4, portrait
from reportlab.platypus import SimpleDocTemplate, Image, Paragraph, Spacer
from reportlab.platypus import PageBreak, Table
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.rl_config import defaultPageSize
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib import colors
from reportlab.lib.colors import Color
from reportlab.lib.units import inch, cm, mm
from reportlab.lib.utils import ImageReader
from PIL import Image as PILImage
from cStringIO import StringIO
from reportlab.pdfgen import canvas
import xlwt

arcpy.env.overwriteOutput = True

PAGE_HEIGHT = defaultPageSize[1]
PAGE_WIDTH = defaultPageSize[0]

STYLES = getSampleStyleSheet()
STYLES.add(ParagraphStyle(name='Center', alignment=TA_CENTER,
                          fontName='Helvetica-Bold', fontSize=20,
                          spaceAfter=30)
          )
STYLES.add(ParagraphStyle(name='Left', alignment=TA_LEFT,
                          fontName='Helvetica-Bold', fontSize=15,
                          textColor='cornflowerblue')
          )
STYLES.add(ParagraphStyle(name='Right', alignment=TA_RIGHT,
                          fontName='Helvetica')
          )
STYLES.add(ParagraphStyle(name='sr_center', alignment=TA_CENTER,
                          fontName='Helvetica'))

STYLEH2 = STYLES['Heading2']

#   Specifying style format
STYLE = ParagraphStyle(name='Normal', fontName='Helvetica', fontSize=8)

OUTPUTPATH = arcpy.env.scratchGDB
WORKSPACE = r"in_memory"
SCRATCH = arcpy.env.scratchFolder

#   Geometry Service to calculate area of input AOI
GEOMTRY_SERVICE_URL = "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer/areasAndLengths"

#   specifying variable
DATA_TYPE_FILE_GDB = "File GDB"
DATA_TYPE_ESRI_SHAPEFILE = "Esri Shapefile"
DATA_TYPE_CSV_FORMAT = "CSV Format"
DETAIL_REPORT_TYPE = "Detailed Report"
QUICK_REPORT_TYPE = "Quick Report"
REPORT_FORMAT = ""

LOGO_URL = arcpy.GetParameterAsText(9)
REPORT_FORMAT = arcpy.GetParameterAsText(1)

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

def extract_zip(zip_file_name):
    """ This function extracts the zip file in scratch workspace. """
    try:
        arcpy.AddMessage("Extracting zipped files which contains shapefiles" +
                         " for the analysis...")
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
            dir_path = os.path.join(SCRATCH, zip_file_name.split("\\")[-1][:-4])
            if not os.path.exists(dir_path):
                os.mkdir(dir_path)
            archive.extractall(dir_path)

        #   Closing zip file to release the lock
        zip_data.close()
        return dir_path

    except (zipfile.BadZipfile) as error:
        arcpy.AddError("Error occured during extract_zip:" + str(error))
        sys.exit()


def validate_detailed_report(web_map_as_json, layer_json, area_of_interest,
                             zip_file_name, report_units):
    """This function helps to validate input parameters for detailed report type
    """
    try:
        if zip_file_name == "" and layer_json == "#":
            arcpy.AddError("Either Layer json or zip file must be" +
                           "provided, unable to proceed further.")
            sys.exit()

        if zip_file_name != "" and layer_json != "#":
            zip_dir_path = extract_zip(zip_file_name)

            raw_string = layer_json.encode("unicode-escape")
            layer_json = json.loads(raw_string)
            mxd_path = layer_json[0]["mxd_path"]

            # Load MXD
            mxd = arcpy.mapping.MapDocument(mxd_path)
            layer_ids = []
            for layer in layer_json:
                layer_ids.append(layer["layerID"])
            all_layers_data, fields_data = intersect_layers(
                area_of_interest, mxd, layer_ids, "data", report_units,
                zip_dir_path)
            area = calculate_area(area_of_interest, report_units)
            image = create_image_to_print(web_map_as_json)
            if not area or not image:
                return False
            else:
                pdf_path = generate_pdf(image, all_layers_data, fields_data,
                                        area, "")
                return pdf_path

        if zip_file_name != "" and layer_json == "#":
            zip_dir_path = extract_zip(zip_file_name)
            all_layers_data, fields_data = intersect_layers(
                area_of_interest, "", "", "zip_file", report_units,
                zip_dir_path)
            area = calculate_area(area_of_interest, report_units)
            image = create_image_to_print(web_map_as_json)
            if not area or not image:
                return False
            else:
                pdf_path = generate_pdf(image, all_layers_data, fields_data,
                                        area, "")
                return pdf_path

        if layer_json != "#" and zip_file_name == "":
            #arcpy.CreateFileGDB_management("in_memory", "in_memory")

            raw_string = layer_json.encode("unicode-escape")
            layer_json = convert(json.loads(raw_string))

            mxd_path = layer_json[0]["mxd_path"]
            # Load MXD
            mxd = arcpy.mapping.MapDocument(mxd_path)
            layer_ids = []
            for layer in layer_json:
                layer_ids.append(layer["layerID"])
            all_layers_data, fields_data = intersect_layers(
                area_of_interest, mxd, layer_ids, "layerJSON", report_units, "")
            area = calculate_area(area_of_interest, report_units)
            image = create_image_to_print(web_map_as_json)
            if not area or not image:
                return False
            else:
                pdf_path = generate_pdf(image, all_layers_data, fields_data,
                                        area, "")
                return pdf_path

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during validate_detailed_report:" +
                       str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occured during validate_detailed_report:" +
                       str(error))
        sys.exit()

#   validating quick report type
def validate_quick_report(web_map_as_json, quick_summary_json,
                          area_of_interest, report_units):
    """This function helps to validate input parameters for quick report type.
    """
    try:
        raw_string = quick_summary_json.encode("unicode-escape")
        quick_summary_json = json.loads(raw_string)

        area = calculate_area(area_of_interest, report_units)
        image = create_image_to_print(web_map_as_json)
        if not area or not image:
            return False
        else:
            pdf_path = generate_pdf(image, [], [], area, quick_summary_json)
            return pdf_path

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during validate_quick_report:" +
                       str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occured during validate_quick_report:" +
                       str(error))
        sys.exit()

#   intersecting layers from provided layer json and included shapefiles for
#   analysis

def intersect_layers(area_of_interest, mxd, layer_ids, input_type, report_units,
                     zip_dir_path):
    """
    This function helps to intersect layers from json and shapefiles
    """
    arcpy.AddMessage("Intersecting layers and its features...")

    try:
        all_layers_data = []
        if report_units.upper() == "METRIC":
            area_unit = 'Area(SqKm)'
            length_unit = 'Length(Meter)'
        elif report_units.upper() == "STANDARD":
            area_unit = 'Area(Acres)'
            length_unit = 'Length(Miles)'
        all_layers_data.append(["No.", "Name", "Impact", "Count", area_unit,
                                length_unit])
        all_layer_fields_data = []
        fields_data = []
        count = 0
        #df = arcpy.mapping.ListDataFrames(mxd, "")[0]
        #   Get Layers
        if input_type == "layerJSON" or input_type == "data":
            for lyrid in layer_ids:
                layer = arcpy.mapping.ListLayers(mxd)[lyrid]
                if layer.isFeatureLayer == True:
                    out_feature = layer.dataSource
                    layer_details = []
                    count += 1
                    para_count = (Paragraph(str(count), STYLES['sr_center']))
                    layer_details.append(para_count)
                    layer_details.append(str(layer.name))
                    sumtablename = str(layer.name) + "_sumtable"
                    layer_data, all_layer_fields_data = intersect(
                        out_feature, area_of_interest, sumtablename, area_unit,
                        length_unit)
                    for feat in layer_data:
                        layer_details.append(feat)
                    all_layers_data.append(layer_details)

                    fields_data.append(all_layer_fields_data)

        if input_type == "zip_file" or input_type == "data":
            for shape_file in os.listdir(zip_dir_path):
                if shape_file.endswith(".shp"):
                    layer_details = []
                    count += 1
                    para_count = (Paragraph(str(count), STYLES['sr_center']))
                    layer_details.append(para_count)
                    layer_details.append(shape_file[:-4])
                    sumtablename = shape_file[:-4] + "_sumtable"
                    out_feature = arcpy.FeatureSet()
                    out_feature.load(zip_dir_path + os.path.sep + shape_file)
                    layer_data, all_layer_fields_data = intersect(
                        out_feature, area_of_interest, sumtablename, area_unit,
                        length_unit)
                    for feat in layer_data:
                        layer_details.append(feat)
                    all_layers_data.append(layer_details)
                    fields_data.append(all_layer_fields_data)
                    break

        return all_layers_data, fields_data

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during intersect_layers:" + str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occured during intersect_layers:" + str(error))
        sys.exit()

#   tabulate intesection on features
def intersect(out_feature, area_of_interest, sumtablename, area_unit,
              length_unit):
    """This function helps to to tabulate intersection analysis on features."""
    try:
        layer_data = []
        all_layer_fields_data = []
        desc = arcpy.Describe(out_feature)
        feature_type = desc.shapeType
        if feature_type.upper() == "POINT":
            output_unit = "UNKNOWN"
        if feature_type.upper() == "POLYGON":
            output_unit = "SQUARE_METERS"
        if feature_type.upper() == "POLYLINE":
            output_unit = "METERS"

        fields = desc.fields
        not_include_field = ["AREA", "LENGTH", "ID", "OID", "OBJECTID"]
        fields_names = []
        for fld in fields:
            if (not fld.name in not_include_field and
                    not (str(fld.name).upper()).startswith(("SHAPE", "FID"))):
                fields_names.append(fld.name)
        sumtablepath = "in_memory" + os.sep + sumtablename

        zone_field = arcpy.Describe(area_of_interest).OIDFieldName
        try:
            layer_intersect = arcpy.TabulateIntersection_analysis(
                area_of_interest, zone_field, out_feature, sumtablepath,
                fields_names, "", "", output_unit)

        except arcpy.ExecuteError as error:
            arcpy.AddError("Error while performing intersection")
            arcpy.AddError(str(error))
            sys.exit()

        except Exception as error:
            arcpy.AddError("Error while performing intersection.")
            arcpy.AddError(str(error))
            sys.exit()

        if int(arcpy.GetCount_management(layer_intersect)[0]) != 0:
            impact_status = "Potential Impact"
            search_cursor = arcpy.da.SearchCursor(layer_intersect, ["*"])
            impact_value = 0
            for row in search_cursor:
                impact_value = impact_value + row[-2]

            all_fields_data = append_data(out_feature, layer_intersect,
                                      sumtablename, area_unit, length_unit)
            all_layer_fields_data.append(all_fields_data)

        elif int(arcpy.GetCount_management(layer_intersect)[0]) == 0:
            impact_status = "No Known Impact"
            impact_value = 0

        layer_data.append(impact_status)

        if feature_type.upper() == "POINT":
            para = Paragraph(str(format(impact_value, '8,d')), STYLES['Right'])
            layer_data.append(para)
            layer_data.append("")
            layer_data.append("")

        if feature_type.upper() == "POLYGON":
            if impact_value == 0:
                area = ""
            else:
                temp_area = int(round(impact_value * 0.00024711))
                area = format(temp_area, '8,d')
            para = Paragraph(str(area), STYLES['Right'])
            layer_data.append("")
            layer_data.append(para)
            layer_data.append("")

        if feature_type.upper() == "POLYLINE":
            if impact_value == 0:
                length = ""
            else:
                temp_len = int(round(impact_value * 0.00062137))
                length = format(temp_len, '8,d')
            para = Paragraph(str(length), STYLES['Right'])
            layer_data.append("")
            layer_data.append("")
            layer_data.append(para)

        return  layer_data, all_layer_fields_data

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during intersect:" + str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occured during intersect:" + str(error))
        sys.exit()

#   to append data on list to create table
def append_data(out_feature, layer_intersect, sumtablename, area_unit,
                length_unit):
    """
    This function helps to append data on created lists in this fucntion to
    maintain table format in PDF
    """
    try:
        all_fields_data = []
        all_fields_data.append([sumtablename[:-9], "", ""])

        for fld in arcpy.ListFields(layer_intersect):
            field_values = []
            exclude_list = ["OBJECTID", "FID", "AREA", "LENGTH", "PNT_COUNT",
                            "PERCENTAGE", "FID_"]
            if fld.name not in exclude_list:

                with arcpy.da.SearchCursor(layer_intersect, [fld.name]) \
                        as search_cursor:
                    for row in search_cursor:
                        field_values.append(row[0])
                desc = arcpy.Describe(out_feature)
                feature_type = desc.shapeType

                if feature_type.upper() == "POINT":
                    sum_field = "PNT_COUNT"
                    field_header = ["No.", fld.name,
                                    Paragraph("COUNT",
                                              style = ParagraphStyle(
                                                name='Right',
                                                alignment=TA_RIGHT,
                                                fontName='Helvetica-Bold'))]
                if feature_type.upper() == "POLYGON":
                    sum_field = "AREA"
                    field_header = ["No.", fld.name,
                                    Paragraph(area_unit,
                                              style = ParagraphStyle(
                                                name='Right',
                                                alignment=TA_RIGHT,
                                                fontName='Helvetica-Bold'))]
                if feature_type.upper() == "POLYLINE":
                    sum_field = "LENGTH"
                    field_header = ["No.", fld.name,
                                    Paragraph(length_unit,
                                              style = ParagraphStyle(
                                                name='Right',
                                                alignment=TA_RIGHT,
                                                fontName='Helvetica-Bold'))]

                field_data = []
                field_data.append(field_header)

                unique_fieldvalue = list(set(field_values))
                unique_fieldvalue.sort()
                count = 0

                for value in unique_fieldvalue:
                    total_count = 0
                    values = []
                    count += 1
                    para_count = (Paragraph(str(count), STYLES['sr_center']))
                    values.append(para_count)
                    #   to wrap the text in table cell
                    para_value = (Paragraph(str(value),
                                            style = ParagraphStyle(
                                                name='value_left',
                                                alignment=TA_LEFT)))
                    values.append(value)
                    sum_val = 0
                    with arcpy.da.SearchCursor(layer_intersect,
                                               [fld.name, sum_field]) as cursor:
                        for row in cursor:
                            if feature_type.upper() == "POINT":
                                row_value = int(row[1])
                            if feature_type.upper() == "POLYGON":
                                row_value = int(round(row[1] * 0.00024711))
                            if feature_type.upper() == "POLYLINE":
                                row_value = int(round(row[1] * 0.00062137))
                            total_count = total_count + row_value
                            if row[0] == value:
                                sum_val = (sum_val + row_value)
                                val = format(int(sum_val), '8,d')
                            total = format(total_count, '8,d')
                            para_val = (Paragraph(str(val), STYLES['Right']))
                        values.append(para_val)

                        field_data.append(values)
                total_str_para = Paragraph("Total",
                                           style = ParagraphStyle(
                                                   name='total_bold',
                                                   alignment=TA_LEFT,
                                                   fontName='Helvetica-Bold'))
                field_data.append(["", total_str_para,
                                   Paragraph(str(total),
                                   style = ParagraphStyle(
                                           name='Right', alignment=TA_RIGHT,
                                           fontName='Helvetica-Bold'))])
                all_fields_data.append(field_data)
        return all_fields_data

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during append_data:" + str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occured during append_data:" + str(error))
        sys.exit()

#   calculating area
def calculate_area(area_of_interest, report_units):
    """
    This function helps to calculate area of AOI
    """
    try:
        if report_units == "Standard":
            area_unit = ["esriAcres", "Acres"]
        else:
            area_unit = ["esriSquareKilometers", "SqKm"]

        aoi_fesatureset = arcpy.FeatureSet()
        aoi_fesatureset.load(area_of_interest)
        area_of_interest = convert(json.loads(aoi_fesatureset.JSON))

        spatial_reference_id = area_of_interest['spatialReference']['wkid']

        ring = area_of_interest['features'][0]['geometry']
        rings = []
        rings.append(ring)
        geo_params = {'sr':spatial_reference_id, 'polygons':rings,
                      'lengthUnit': "", 'areaUnit':{"areaUnit" : area_unit[0]},
                      'f':'json'}

        arcpy.AddMessage("Calculating area of drawn AOI...")

        data = urllib.urlencode(geo_params)
        request = urllib2.Request(GEOMTRY_SERVICE_URL, data)
        aoi_area = json.loads(urllib2.urlopen(request).read())
        arcpy.AddMessage("Area of AOI calculated successfully.")
        area = "{0} {1}".format('%.1f' % aoi_area['areas'][0], area_unit[1])

        return area

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during calculate_area:" + str(error))
        return False

    except Exception as error:
        arcpy.AddError("Error occured during calculate_area:" + str(error))
        return False

#   Creating PNG format Image
def create_image_to_print(web_map_as_json):
    """
    This function helps to create PNG format Image which will be inserted into
    PDF report
    """
    try:
        arcpy.AddMessage("Printing Image..")
        # setting parametrs for Export web map server
        output_file = SCRATCH  + os.sep + "image"
        image_format = "PNG32"

        web_map_as_json['exportOptions']['outputSize'] = [620, 820]

        converted_web_json = convert(web_map_as_json)
        # exporting web map as json into image

        image = arcpy.ExportWebMap_server(str(converted_web_json), output_file,
                                          image_format, "", "MAP_ONLY")
        arcpy.AddMessage(image)
        for img in os.listdir(SCRATCH):
            if img.endswith(".png"):
                webmap = img
                break

        return SCRATCH + os.sep + webmap

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during create_image_to_print:" +
                       str(error))
        return False

    except Exception as error:
        arcpy.AddError("Error occured during create_image_to_print:" +
                       str(error))
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

def generate_pdf(image, all_layers_data, fields_data, area, quick_summary_json):
    """
    This function helps to genrate PDF report for quick summary report and
    detailed summary report
    """
    arcpy.AddMessage("Generating PDF ...")
    if REPORT_FORMAT == QUICK_REPORT_TYPE:
        pdf_name = SCRATCH + os.sep + "Quick Summary Report.pdf"

    elif REPORT_FORMAT == DETAIL_REPORT_TYPE:
        pdf_name = SCRATCH + os.sep + "Environmental Impact Analysis Report.pdf"

#   Specify height and width for Layout
    height = 7.5 * inch
    width = 6.35 * inch

    try:
        doc = SimpleDocTemplate(pdf_name)
        doc.pagesize = portrait(A4)
        doc.topMargin = 90

        parts = []

        heading1 = "Area of Interest (AOI) Information"
        parts.append(Paragraph(heading1, STYLES["Left"]))
        parts.append(Spacer(0.20, 0.20 * inch))

        now = time.strftime("%c")
        heading2 = "Date: " + str(now)
        parts.append(Paragraph(heading2, STYLEH2))
        parts.append(Spacer(0.03, 0.03 * inch))

        heading3 = "Area: "
        parts.append(Paragraph(heading3 + str(area), STYLEH2))
        parts.append(Spacer(0.05, 0.05 * inch))

        img = Image(str(image), width, height)
        img.hAlign = TA_CENTER
        parts.append(img)
        parts.append(PageBreak())

        if REPORT_FORMAT == DETAIL_REPORT_TYPE:
            arcpy.AddMessage("Building PDF for {0}.".format(REPORT_FORMAT))
            heading4 = "Summary of Impact"
            parts.append(Paragraph(heading4, STYLES["Left"]))
            parts.append(Spacer(0.20, 0.20 * inch))

            tbl = Table(all_layers_data,
                        style=[('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                               ('LEFTPADDING', (0, 0), (5, 0), 6),
                               ('ALIGN', (0, 0), (-5, 0), 'LEFT'),
                               ('FONT', (0, 0), (5, 0), 'Helvetica-Bold', 10)])
            parts.append(Spacer(0.20, 0.20 * inch))
            parts.append(tbl)

            for i in xrange(len(fields_data)):
                if len(fields_data[i]) > 0:
                    layer_name = fields_data[i][0][0][0] +" - Impact Information"
                    parts.append(Spacer(0.35, 0.35 * inch))
                    parts.append(Paragraph(layer_name, STYLES["Left"]))
                    parts.append(Spacer(0.20, 0.20 * inch))

                    for j in xrange(1, len(fields_data[i][0])):
                        field_value_table = Table(
                            fields_data[i][0][j],
                            style=[('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                                   ('LEFTPADDING', (0, 0), (2, 0), 6),
                                   ('FONT', (0, 0), (2, 0), 'Helvetica-Bold', 10)],
                            colWidths=(0.4*inch, 4.2*inch, 1*inch))
                        parts.append(Spacer(0.20, 0.20 * inch))
                        parts.append(field_value_table)

        elif REPORT_FORMAT == QUICK_REPORT_TYPE:
            arcpy.AddMessage("Building PDF for {0}.".format(REPORT_FORMAT))
            layer_name = []
            for i in xrange(len(quick_summary_json)):
                lyr_name = quick_summary_json[i]["layerName"]
                parts.append(Spacer(0.20, 0.20 * inch))
                parts.append(Paragraph(lyr_name, STYLES["Left"]))
                parts.append(Spacer(0.10, 0.10 * inch))

                for fields in quick_summary_json[i]["summaryFields"]:
                    if quick_summary_json[i]['summaryUnits'].lower() ==\
                                                                    'standard':
                        if quick_summary_json[i]['summaryType'].lower() == \
                                                                        'area':
                            field_header = ["No.", fields['fieldName'], \
                                                        "Area(acres)"]
                        elif quick_summary_json[i]['summaryType'].lower() == \
                                                                    "length":
                            field_header = ["No.", fields['fieldName'], \
                                                        "Length(Miles)"]
                        elif quick_summary_json[i]['summaryType'].lower() ==\
                                                                        "count":
                            field_header = ["No.", fields['fieldName'], \
                                                                "Count"]
                    elif quick_summary_json[i]['summaryUnits'].lower() == \
                                                                'metric':
                        if quick_summary_json[i]['summaryType'].lower() ==\
                                                                        'area':
                            field_header = ["No.", fields['fieldName'], \
                                                            "Area(SqKm)"]
                        elif quick_summary_json[i]['summaryType'].lower() == \
                                                                    "length":
                            field_header = ["No.", fields['fieldName'], \
                                                            "Length(Meters)"]
                        elif quick_summary_json[i]['summaryType'].lower() ==\
                                                                        "count":
                            field_header = ["No.", fields['fieldName'], "Count"]
                    field_data = []
                    field_data.append(field_header)
                    fields['fieldValues'].sort()
                    for j in xrange(len(fields['fieldValues'])):
                        for the_key, the_value in fields['fieldValues'][j].\
                                                        iteritems():
                            val = float(the_value)
                            val_param = format(int(round(val)), '8,d')
                            value = [j + 1, the_key, val_param]
                        field_data.append(value)
                    field_value_table = Table(
                        field_data,
                        style=[('GRID', (0, 0), (-1, -1), 0.5, colors.black),
                               ('LEFTPADDING', (0, 0), (2, 0), 6),
                               ('FONT', (0, 0), (2, 0), 'Helvetica-Bold', 10)],
                        colWidths=(0.4*inch, 4.2*inch, 1.1*inch))
                    parts.append(Spacer(0.20, 0.20 * inch))
                    parts.append(field_value_table)

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

def on_first_page(canvas, doc):
    canvas.saveState()
    header(canvas, doc)
    footer(canvas, doc)
    canvas.restoreState()

def on_later_pages(canvas, doc):
    """ Draw header and footer to every page """
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
        canvas.drawString(PAGE_WIDTH - 180, 0.5 * doc.bottomMargin, title)

    canvas.setLineWidth(1)
    canvas.setStrokeColor(Color(0, 0.2627450980392157, 0.42745098039215684, 1))
    x = doc.leftMargin - 25
    y = 0.75*doc.bottomMargin
    canvas.line(x, y, (PAGE_WIDTH - x), y)
    canvas.restoreState()

def header(canvas, doc):
    image = None
    image = get_image(LOGO_URL)

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
    indent_right = 47.5
    styleT = STYLES['Title']
    styleT.backColor = Color(0, 0.2627450980392157, 0.42745098039215684, 1)
    styleT.textColor = Color(1, 1, 1, 1)
    styleT.borderPadding = (3, 3, 2, 3)
    styleT.alignment = TA_LEFT
    styleT.rightIndent = doc.rightMargin + 34.5
    styleT.fontSize = 15
    logo_aspect_ratio = None
    if len(LOGO_URL) == 0:
        styleT.rightIndent = doc.rightMargin
        image_width = 0
        logo_header_gap = 0
    if image:
        logo_aspect_ratio = image.size[0]/float(image.size[1])
    if logo_aspect_ratio > 1.2:
        image_width = logo_aspect_ratio * image_height
##        if doc.page == 1:
        header_width -= image_width - image_height

    para = Paragraph('<font>' + title + '</font>', styleT)
    para_width, para_height = para.wrap(header_width, header_height)
##    if len(LOGO_URL) == 0:
##        para_width, para_height = para.wrap(doc.width + 13, doc.topMargin)
##    else:
##        para_width, para_height = para.wrap(doc.width + 0.75, doc.topMargin)
##    para_width, para_height = para.wrap(566.4, doc.topMargin)
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
    y = PAGE_HEIGHT-82
    canvas.line(indent_right, y, (PAGE_WIDTH - indent_right), y)

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

#   validating data type
def validate_data_type(data_download_type, layer_json, area_of_interest,
                       zip_file_name):
    """This function helps to validate input parameters for provided data types.
    """
    try:
        if zip_file_name == "" and layer_json == "#":
            arcpy.AddError("Either zip file or layer JSON must be provided.")

        if zip_file_name != "" and layer_json != "#":
            zip_dir_path = extract_zip(zip_file_name)
            raw_string = layer_json.encode("unicode-escape")
            layer_json = json.loads(raw_string)
            mxd_path = layer_json[0]["mxd_path"]
            # Load MXD
            mxd = arcpy.mapping.MapDocument(mxd_path)
            layer_ids = []
            for layer in layer_json:
                layer_ids.append(layer["layerID"])
            zipped_file = download_data(data_download_type, area_of_interest,
                                        mxd, layer_ids,
                                        zip_dir_path)
            return zipped_file

        if layer_json != "#" and zip_file_name == "":
            raw_string = layer_json.encode("unicode-escape")
            layer_json = json.loads(raw_string)
            mxd_path = layer_json[0]["mxd_path"]
            # Load MXD
            mxd = arcpy.mapping.MapDocument(mxd_path)
            layer_ids = []
            for layer in layer_json:
                layer_ids.append(layer["layerID"])
            zipped_file = download_data(data_download_type, area_of_interest,
                                        mxd, layer_ids, "")
            return zipped_file

        if zip_file_name != "" and layer_json == "#":
            zip_dir_path = extract_zip(zip_file_name)
            zipped_file = download_data(data_download_type, area_of_interest,
                                        "", [], zip_dir_path)
            return zipped_file

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during validate_data_type:" + str(error))
        return False

    except Exception as error:
        arcpy.AddError("Error occured during validate_data_type:" + str(error))
        return False


def download_data(data_download_type, area_of_interest, mxd, layer_ids,
                  zip_dir_path):
    """
    This function helps to download data in file gdb and zip it.
    """
    try:
        lyrlist = []
        arcpy.AddMessage("Downloading data in {0}.".format(data_download_type))

        for lyrid in layer_ids:
            layer = arcpy.mapping.ListLayers(mxd)[lyrid]
            if layer.isFeatureLayer == True:

                input_data = layer.dataSource
                if REPORT_FORMAT == DETAIL_REPORT_TYPE:
                    out_feature_name = str(layer.name) + "_Clip"
                elif REPORT_FORMAT == QUICK_REPORT_TYPE:
                    out_feature_name = str(layer.name) + "_Intersect"

                lyrlist.append(out_feature_name)

                if data_download_type == DATA_TYPE_FILE_GDB:
                    folder_to_walk = OUTPUTPATH
                    zip_file_name = "ToolOutput.gdb"
                    output_feature = os.path.join(OUTPUTPATH, out_feature_name)
                    if REPORT_FORMAT == DETAIL_REPORT_TYPE:
                        data = arcpy.Clip_analysis(input_data, area_of_interest,
                                                   output_feature)
                    else:
                        data = arcpy.Intersect_analysis(
                            [area_of_interest, input_data], output_feature)

                elif data_download_type == DATA_TYPE_ESRI_SHAPEFILE:
                    folder_to_walk = SCRATCH
                    zip_file_name = "ToolOutput"
                    output_feature = os.path.join(SCRATCH, out_feature_name)
                    if REPORT_FORMAT == DETAIL_REPORT_TYPE:
                        data = arcpy.Clip_analysis(input_data, area_of_interest,
                                                   output_feature)
                    else:
                        data = arcpy.Intersect_analysis(
                            [area_of_interest, input_data], output_feature)

                elif data_download_type == DATA_TYPE_CSV_FORMAT:
                    folder_to_walk = SCRATCH
                    zip_file_name = "ToolOutput"
                    output_feature = os.path.join(SCRATCH, out_feature_name)

                    if REPORT_FORMAT == DETAIL_REPORT_TYPE:
                        data = arcpy.Clip_analysis(input_data, area_of_interest,
                                        output_feature)
                    else:
                        data = arcpy.Intersect_analysis([area_of_interest,
                            input_data], output_feature)

                    desc = arcpy.Describe(data)
                    #   pylint: disable = E1103
                    fieldnames = [f.name for f in desc.fields if f.type not in\
                                    ["Geometry", "Raster", "Blob", "ID"]]
                    #   pylint: enable = E1103
                    csv_file_name = str(layer.name) + ".csv"
                    csv_file_path = os.path.join(SCRATCH, csv_file_name)
                    with open(csv_file_path,'wb') as out_file:
                        out_writer = csv.writer(out_file)
                        out_writer.writerow(fieldnames)
                        #   pylint: disable = E1101
                        with arcpy.da.SearchCursor(data, fieldnames) as cursor:
                        #   pylint: enable = E1101
                            for row in cursor:
                                out_writer.writerow(row)

        if zip_dir_path != "":
            for shape_file in os.listdir(zip_dir_path):
                if ((shape_file.endswith(".shp")) and
                        shape_file[:-4] not in lyrlist):

                    if REPORT_FORMAT == DETAIL_REPORT_TYPE:
                        out_feature_name = (shape_file)[:-4] + "_Clip"
                    elif REPORT_FORMAT == QUICK_REPORT_TYPE:
                        out_feature_name = (shape_file)[:-4] + "_Intersect"

                    if data_download_type == DATA_TYPE_FILE_GDB:

                        output_feature = os.path.join(OUTPUTPATH,
                                                      out_feature_name)
                        if REPORT_FORMAT == DETAIL_REPORT_TYPE:
                            shp_data = arcpy.Clip_analysis(
                                zip_dir_path + os.sep + shape_file,
                                area_of_interest, output_feature)
                        else:
                            shp_data = arcpy.Intersect_analysis(
                                [area_of_interest,
                                 zip_dir_path + os.sep + shape_file],
                                output_feature)

                    elif data_download_type == DATA_TYPE_ESRI_SHAPEFILE:
                        output_feature = os.path.join(SCRATCH, out_feature_name)
                        if REPORT_FORMAT == DETAIL_REPORT_TYPE:
                            shp_data = arcpy.Clip_analysis(
                                zip_dir_path + os.sep + shape_file,
                                area_of_interest, output_feature)
                        else:
                            shp_data = arcpy.Intersect_analysis(
                                [area_of_interest,
                                 zip_dir_path + os.sep + shape_file],
                                output_feature)

                    elif data_download_type == DATA_TYPE_CSV_FORMAT:
                        output_feature = os.path.join(SCRATCH, out_feature_name)
                        if REPORT_FORMAT == DETAIL_REPORT_TYPE:
                            shp_data = arcpy.Clip_analysis(shape_file,
                            area_of_interest, output_feature)
                        else:
                            shp_data = arcpy.Intersect_analysis(
                             [area_of_interest, shape_file], output_feature)
                        desc = arcpy.Describe(shp_data)

                        #   pylint: disable = E1103
                        fieldnames = [f.name for f in desc.fields if f.type not in\
                                        ["Geometry", "Raster", "Blob"]]
                        #   pylint: enable = E1103

                        csv_file_name = (shape_file)[:-4] + ".csv"
                        csv_file_path = os.path.join(SCRATCH, csv_file_name)

                        with open(csv_file_path,'wb') as out_file:
                            out_writer = csv.writer(out_file)
                            out_writer.writerow(fieldnames)

                            #   pylint: disable = E1101
                            with arcpy.da.SearchCursor(shp_data, fieldnames) \
                                                                        as cursor:
                            #   pylint: enable = E1101
                                for row in cursor:
                                    out_writer.writerow(row)
                    break

        arcpy.AddMessage("zipping output...")
        zipped_file = os.path.join(SCRATCH, "ToolOutput.zip")
        zipobj = zipfile.ZipFile(zipped_file, 'w')

        if data_download_type == DATA_TYPE_FILE_GDB:
            for filename in os.listdir(OUTPUTPATH):
                zipobj.write(os.path.join(OUTPUTPATH, filename),
                             os.path.basename("ToolOutput.gdb") +
                             "/" + os.path.basename(filename))

        if data_download_type == DATA_TYPE_ESRI_SHAPEFILE:
            for filename in os.listdir(SCRATCH):
                if not filename.endswith(".zip") and\
                        (filename[:-4].endswith("_Clip") or\
                        filename[:-4].endswith("_Intersect")):
                    zipobj.write(os.path.join(SCRATCH, filename),
                                 os.path.basename("ToolOutput") +
                                 "/" + os.path.basename(filename))

        if data_download_type == DATA_TYPE_CSV_FORMAT:
            for filename in os.listdir(SCRATCH):
                if filename.endswith(".csv"):
                    zipobj.write(os.path.join(SCRATCH, filename),
                                 os.path.basename("ToolOutput") +
                                 "/" + os.path.basename(filename))
        zipobj.close()
        arcpy.AddMessage("zipped file created")
        return zipped_file

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during download_data:" + str(error))
        sys.exit()

    except Exception as error:
        arcpy.AddError("Error occured during download_data:" + str(error))
        sys.exit()

def main():
    """main"""
    web_map_as_json = arcpy.GetParameterAsText(0).strip()

    area_of_interest = arcpy.GetParameterAsText(2)

    zip_file_name = arcpy.GetParameterAsText(3)

    layer_json = arcpy.GetParameterAsText(4).strip()

    quick_summary_json = arcpy.GetParameterAsText(5).strip()

    pdf_check = arcpy.GetParameter(6)

    data_download_type = arcpy.GetParameterAsText(7)

    report_units = arcpy.GetParameterAsText(8)

    if data_download_type == "" and not pdf_check:
        arcpy.AddError("Either Data Download Type or PDF Report has to be " +
                       "selected.")
        sys.exit()
    if area_of_interest == "":
        arcpy.AddError("AOI not provided.")
        sys.exit()

    if pdf_check:
        if web_map_as_json == "":
            arcpy.AddError("WebMap JSON not provided for PDF report.")
            sys.exit()
        else:
            raw_string = web_map_as_json.encode("unicode-escape")
            web_map_as_json = json.loads(raw_string)

        if report_units == "":
            arcpy.AddError("Please provide Report Units.")
            sys.exit()

        if REPORT_FORMAT == DETAIL_REPORT_TYPE:
            if quick_summary_json != "":
                arcpy.AddWarning("Quick summary json is provided for detailed" +
                                 "report which is not required")
            pdf_path = validate_detailed_report(
                web_map_as_json, layer_json, area_of_interest, zip_file_name,
                report_units)
            if not pdf_path:
                return
            else:
                arcpy.SetParameterAsText(10, pdf_path)

        if REPORT_FORMAT == QUICK_REPORT_TYPE:
            if quick_summary_json == "":
                arcpy.AddError("No json for quick summary report." +
                               "Cannot generate PDF.")
                sys.exit()

            pdf_path = validate_quick_report(
                web_map_as_json, quick_summary_json, area_of_interest,
                report_units)
            if not pdf_path:
                return
            else:
                arcpy.SetParameterAsText(10, pdf_path)

    if data_download_type != "":
        if REPORT_FORMAT == "":
            arcpy.AddError("Report_type is not provided, unable to" +
                            "proceed further.")
            sys.exit()

        data = validate_data_type(data_download_type, layer_json,
                                  area_of_interest, zip_file_name)
        if not data:
            return
        else:
            arcpy.SetParameterAsText(11, data)


if __name__ == '__main__':
    main()




