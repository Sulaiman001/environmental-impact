
# Esri start of added imports
import sys, os, arcpy
# Esri end of added imports

# Esri start of added variables
g_ESRI_variable_1 = u'%scratchFolder%\\tableview'
# Esri end of added variables

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

import arcpy, os, zipfile
arcpy.env.overwriteOutput = True

#   extracting zip files
def extract_zip(zip_file_name):
    """
    This function extracts the zip file in scratch workspace.
    """
    try:
        #   Opening zip file in rb+ mode to read the data from it
        zip_data = open(zip_file_name, "rb")
        zip_data.read()

        archive = zipfile.ZipFile(zip_data)
        if archive.testzip() != None:
            arcpy.AddMessage("Invalid zipfile!")
            arcpy.AddMessage("Aborting Script")
        else:
            #   Extracting zip file at scratch workspace
            archive.extractall("in_memory")

        #   Closing zip file to release the lock on it
        zip_data.close()
        return os.path.basename(zip_file_name)[:-4]
    except (zipfile.BadZipfile) as error:
        arcpy.AddError("Error occured during execution:" + str(error))
        return False

#   Converting shapefile into featureset
def create_featureset(shape_file_name):
    """
    This function helps to list shapefiles from the extracted directory and
    finds the first shapefile to convert it into featureset
    """
    try:
        found_shp = False
        for shape_file in os.listdir("in_memory"):
            if (shape_file.endswith(".shp") and
                shape_file[:-4] == shape_file_name):
                found_shp = True
                arcpy.AddMessage("Shapefile is found at:" + "in_memory" +
                                    os.path.sep + shape_file)

                #   Loading extracted shape file into feature set to be returned
                #   as Output Parameter
                out_featureset = arcpy.FeatureSet()
                out_featureset.load("in_memory" + os.path.sep + shape_file)
                arcpy.AddMessage("Featureset has been created")
                return out_featureset

        if not found_shp:
            arcpy.AddError("There is no shapefile in this directory." + "\n"
                            + "Cannot proceed further.")
            return False

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during execution:" + str(error))
        return False

#   checking feature type and units
def check_feature_type(featureset):
    """
    This function helps to find out type of feature and its units
    """
    try:
        #   Checking for geometry type and its unit
        #   pylint: disable = E1103
        desc = arcpy.Describe(featureset)
        if desc.shapeType.upper() == "POLYGON":
            arcpy.AddMessage ("Given shapetype is 'POLYGON'")
            feat_desc = arcpy.Describe(featureset)
            units = feat_desc.spatialReference.linearUnitName
            return [desc.shapeType, units]

        elif desc.shapeType.upper() == "POLYLINE":
            arcpy.AddMessage ("Given shapetype is 'POLYLINE'")
            feat_desc = arcpy.Describe(featureset)
            units = feat_desc.spatialReference.linearUnitName
            return [desc.shapeType, units]

        elif desc.shapeType.upper() == "POINT":
            arcpy.AddMessage ("Given shapetype is 'POINT'")
            feat_desc = arcpy.Describe(featureset)
            units = feat_desc.spatialReference.linearUnitName
            return [desc.shapeType, units]
        #   pylint: enable = E1103

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during execution:" + str(error))
        return False

#   Checking parametrs
def check_parameters(feature_type):
    """This function helps to check the parameters of provided goemtry"""
    try:
        if feature_type[0].upper() == "POLYGON":
            list_of_fields = ["summaryfield", "summaryvalue", "area_acres",
                        "area_sqkm"]
            search_fields = ["AREA"]
            output_unit = "SQUARE_METERS"

        elif feature_type[0].upper() == "POLYLINE":
            list_of_fields = ["summaryfield", "summaryvalue", "length_Miles",
                        "length_Km"]
            search_fields = ["LENGTH"]
            output_unit = "METERS"

        elif feature_type[0].upper() == "POINT":
            list_of_fields = ["summaryfield", "summaryvalue", "Count"]
            search_fields = ["PNT_COUNT"]
            output_unit = "Not Required"

        return [list_of_fields, search_fields, output_unit]
    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during execution:" + str(error))

#   Creating summary table
def create_summary_table(feature_details):
    """This function helps to create summary table of required fields"""
    try:

        arcpy.AddMessage("Generating Summary Table...")
        summary_table = arcpy.CreateTable_management("in_memory",
                                                    "summary_table")
        arcpy.MakeTableView_management(summary_table, g_ESRI_variable_1)

        for fldname in feature_details[0]:
            arcpy.AddField_management(summary_table, fldname, "TEXT")
        arcpy.AddMessage("Summary Table is created")
        return summary_table
    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during execution:" + str(error))

#   Using tabulate intersection analysis to sumup parameters
def tabulate_intersection(featureset, feature_type, area_of_interset,
                            feature_details):
    """
    This function helps to sumup parameters by using Tabulate Intersection
    Analysis
    """
    try:
        fields = arcpy.ListFields(featureset)
        if len(fields) != 0:
            arcpy.AddMessage (str(len(fields)) + " number of fields are found")
            arcpy.AddMessage("Adding summarized value to Summary Table...")

            table_list = {}
            not_include_field = ["AREA", "LENGTH", "ID", "OID", "OBJECTID"]
            fields_names = []
            for fld in fields:
                if not fld.name in not_include_field and not (str(fld.name).
                                        upper()).startswith(("SHAPE", "FID")):
                    fields_names.append(fld.name)

            for flds in fields_names:

                sum_table_name = (flds) + "_sumtable"
                sum_table_path = "in_memory" + os.sep + sum_table_name

                zone_field = arcpy.Describe(area_of_interset).OIDFieldName

                #   Summarising values of fields using Tabulate Intersection
                #   Analysis
                if feature_type[0].upper() !="POINT":
                    sum_table = arcpy.TabulateIntersection_analysis(
                                area_of_interset,
                                zone_field, featureset, sum_table_path
                                , flds,"", "", feature_details[2])
                else:
                    sum_table = arcpy.TabulateIntersection_analysis(
                                area_of_interset, zone_field, featureset,
                                sum_table_path, flds)
                table_list[flds] = sum_table
            return [table_list, fields_names]
        else:
            return False

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during execution:" + str(error))

#   Adding summarised value to summary table
def add_value(summarized_value, feature_type, feature_details, summary_table):
    """
    This function will help to add summarised value to created summary table
    """
    try:
        for fld in summarized_value[1]:
            feature_details[1].append(fld)
            #   pylint: disable = E1101
            with arcpy.da.SearchCursor(summarized_value[0][fld],
                                        feature_details[1]) as search_cursor:
                #   Adding values in the fields of Summary Table
                for row in search_cursor:
                    field_name = row[1]
                    field_param = row[0]
                    if feature_type[0].upper() != "POINT":
                        converted_units = get_converted_units(feature_type,
                                                            field_param)

                        summary_row_values = (fld, field_name, converted_units[0],
                                            converted_units[1])
                    else:
                        summary_row_values = (fld, field_name, field_param)
                    #   pylint: disable = E1101
                    with arcpy.da.InsertCursor(summary_table,
                                            feature_details[0]) as insert_cursor:
                        insert_cursor.insertRow(summary_row_values)
                feature_details[1].remove(fld)

        arcpy.AddMessage("Summarized value added to Summary Table.")
        return summary_table

    except Exception as error:
        arcpy.AddError("Error occured during execution:" + str(error))

#   Converting unit of goemtry
def get_converted_units(feature_type, field_param):
    """ This function helps to convert units of goemetry. """
    try:
        if feature_type[0].upper() == "POLYGON":
            if feature_type[1].upper() == "METER":
                area_in_acre = field_param * 0.00024711
                area_in_sqkm = field_param / 1000000

            return [area_in_acre, area_in_sqkm]

        elif feature_type[0].upper() == "POLYLINE":
            if feature_type[1].upper() == "METER":
                length_in_miles = field_param * 0.00062137
                length_in_km = field_param / 1000.0

            return [length_in_miles, length_in_km]

    except arcpy.ExecuteError:
        arcpy.AddError(arcpy.GetMessages(2))


def main():
    """This is a Main Function"""
    #   Variables to define Input Parameters

    area_of_interset = arcpy.GetParameterAsText(0)
    zip_file_name = arcpy.GetParameterAsText(1)

    shape_file_name = extract_zip(zip_file_name)
    if not shape_file_name:
        return

    featureset = create_featureset(shape_file_name)
    if not (featureset):
        return

    feature_type = check_feature_type(featureset)
    if not (feature_type):
        return

    feature_details = check_parameters(feature_type)

    summary_table = create_summary_table(feature_details)
    summarized_value = tabulate_intersection(featureset, feature_type,
                                area_of_interset, feature_details )
    out_table = add_value(summarized_value, feature_type,
                        feature_details, summary_table)

    #   Setting Output
    arcpy.SetParameter(2, out_table)

if __name__ == '__main__':
    main()

