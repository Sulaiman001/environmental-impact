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

#   pylint: disable = E1101, E1103, W0703

import arcpy, os, zipfile
arcpy.env.overwriteOutput = True

SCRATCH = arcpy.env.scratchFolder

def extract_zip(zip_file_name):
    """
    This function extracts the zip file in scratch workspace.
    """
    try:
        # Opening zip file in rb+ mode to read the data from it
        zip_data = open(zip_file_name, "rb")
        zip_data.read()

        archive = zipfile.ZipFile(zip_data)
        if archive.testzip() != None:
            arcpy.AddError("Invalid zipfile. Aborting script")
            return
        else:
            # Extracting zip file at scratch workspace
            archive.extractall(SCRATCH)
        arcpy.AddMessage("Zip file Extracted.")
        # Closing zip file to release the lock on it
        zip_data.close()
        return True     # os.path.basename(zip_file_name)[:-4]

    except (zipfile.BadZipfile) as error:
        arcpy.AddError("ERROR occured while extracting ZIP : " + str(error))
        return False


def shapefile_to_aoi():
    """This function dissolves the extracted shapefile and returns featureset"""
    try:
        found_shp = False
        for shape_file in os.listdir(SCRATCH):
            if (shape_file.endswith(".shp")):
                found_shp = True
                shapefile_path = os.path.join(SCRATCH, shape_file)
                arcpy.AddMessage("Found shapefile: {0}".format(shapefile_path))
                arcpy.AddMessage("Dissolving extracted shapefile...")
                output_fc_name = os.path.join(SCRATCH,
                                              shape_file[:-4] + "_Output.shp")
                arcpy.Dissolve_management(shapefile_path, output_fc_name)
                #  Loading extracted shape file into feature set to be returned
                #  as Output Parameter
                out_featureset = arcpy.FeatureSet()
                out_featureset.load(output_fc_name)
                arcpy.AddMessage("Complete.")
                os.remove(shapefile_path)
                return out_featureset

        if not found_shp:
            arcpy.AddError("Could not find valid shapefile in uploaded zip.")
            return False

    except Exception as error:
        arcpy.AddError("Error:" + str(error))
        return False

def create_featureset():
    """
    This function helps to list shapefiles from the extracted directory and
    finds the first shapefile to convert it into featureset
    """
    try:
        found_shp = False
        for shape_file in os.listdir(SCRATCH):
            if shape_file.endswith(".shp"):
                found_shp = True
                arcpy.AddMessage("Shapefile is found at:" + SCRATCH +
                                 os.path.sep + shape_file)

                #   Loading extracted shape file into feature set to be returned
                #   as Output Parameter
                out_featureset = arcpy.FeatureSet()
                out_featureset.load(SCRATCH + os.path.sep + shape_file)
                arcpy.AddMessage("Featureset has been created.")
                return out_featureset

        if not found_shp:
            arcpy.AddError("There is no shapefile in this directory." + "\n"
                           + "Cannot proceed further.")
            return False

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during execution:" + str(error))
        return False

def check_feature_type(featureset):
    """
    This function helps to find out type of feature and its units
    """
    try:
        #   Checking for geometry type and its unit

        feat_desc = arcpy.Describe(featureset)
        arcpy.AddMessage(("Shapefile is of '{0}' type.")
                         .format(str(feat_desc.shapeType)))
        units = feat_desc.spatialReference.linearUnitName
        return [feat_desc.shapeType, units]

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during execution:" + str(error))
        return False

def set_table_header(feature_type):
    """This function helps to set the table headers as per provided goemtry"""
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

def create_summary_table(feature_details):
    """This function helps to create summary table of required fields"""
    try:

        arcpy.AddMessage("Generating Summary Table...")
        summary_table = arcpy.CreateTable_management("in_memory",
                                                     "summary_table")
        arcpy.MakeTableView_management(summary_table, "tableview")

        for fldname in feature_details[0]:
            arcpy.AddField_management(summary_table, fldname, "TEXT")
        arcpy.AddMessage("Summary Table is created.")
        return summary_table
    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during execution:" + str(error))

def tabulate_intersection(featureset, feature_type, area_of_interset,
                          feature_details):
    """
    This function helps to sumup parameters by using Tabulate Intersection
    Analysis
    """
    try:
        fields = arcpy.ListFields(featureset)
        if len(fields) != 0:
            arcpy.AddMessage("Adding summarized value to Summary Table...")

            #   Maintain dictionary of field table having Field name as key
            #   and table as value
            table_list = {}

            #   Exclud fields which are not required in resulted Summary table
            not_include_field = ["AREA", "LENGTH", "ID", "OID", "OBJECTID"]
            fields_names = []
            for fld in fields:
                if (not fld.name in not_include_field and
                        not (str(fld.name).upper()).startswith(("SHAPE",
                                                                "FID"))):
                    fields_names.append(fld.name)

            arcpy.AddMessage(str(len(fields_names)) +
                             " number of fields are found.")

            for flds in fields_names:

                sum_table_name = (flds) + "_sumtable"
                sum_table_path = "in_memory" + os.sep + sum_table_name

                zone_field = arcpy.Describe(area_of_interset).OIDFieldName

                #   Summarising values of fields using Tabulate Intersection
                #   Analysis
                if feature_type[0].upper() != "POINT":
                    #   Sending units for Polygon and Polyline Features
                    sum_table = arcpy.TabulateIntersection_analysis(
                        area_of_interset, zone_field, featureset,
                        sum_table_path, flds, "", "", feature_details[2])
                else:
                    #   Units are not required for Point Features
                    sum_table = arcpy.TabulateIntersection_analysis(
                        area_of_interset, zone_field, featureset,
                        sum_table_path, flds)

                table_list[flds] = sum_table
            return [table_list, fields_names]
        else:
            return False

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occured during execution:" + str(error))


def add_value(summarized_value, feature_type, feature_details, summary_table):
    """
    This function will help to add summarised value to created summary table
    """
    try:
        for fld in summarized_value[1]:
            feature_details[1].append(fld)
            with arcpy.da.SearchCursor(summarized_value[0][fld],
                                       feature_details[1]) as search_cursor:
                #   Adding values in the fields of Summary Table
                for row in search_cursor:
                    field_name = row[1]
                    field_param = row[0]

                    #   Get the values in required units for polygon and
                    #   polyline. Else insert the count of Points
                    if feature_type[0].upper() != "POINT":
                        converted_units = get_converted_units(feature_type,
                                                              field_param)

                        summary_row_values = (fld, field_name,
                                              converted_units[0],
                                              converted_units[1])
                    else:
                        summary_row_values = (fld, field_name, field_param)
                    #   Insert the values in summary table
                    with arcpy.da.InsertCursor(summary_table,
                                               feature_details[0])\
                                               as insert_cursor:
                        insert_cursor.insertRow(summary_row_values)

                feature_details[1].remove(fld)

        arcpy.AddMessage("Summarized value added to Summary Table.")
        return summary_table

    except Exception as error:
        arcpy.AddError("Error occured during execution:" + str(error))


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
    """ Main Function """
    #   Inpt parameters
    zip_file_name = arcpy.GetParameterAsText(0)
    area_of_interest = arcpy.GetParameterAsText(1)

    #   Extract the uploaded zip file
    valid_shp_file = extract_zip(zip_file_name)

    if not valid_shp_file:
        return

    #   If AOI is not provided, perform Shapefile to AOI task
    if area_of_interest == "":
        arcpy.AddMessage("Area of Interest not provided." +
                         " Performing ShapeFile To AOI...")
        out_featureset = shapefile_to_aoi()
        if not out_featureset:
            return

        else:
            #   Set generated feature set as output AOI
            arcpy.SetParameter(2, out_featureset)
            #   Keep second output parameter as blank, as we are not generating
            #   summary table here
            arcpy.SetParameter(3, "")

    #   If AOI is provided perform Analysis Shapefile task
    elif area_of_interest != "":
        aoi_fesatureset = arcpy.FeatureSet()
        aoi_fesatureset.load(area_of_interest)
        aoi_feature_count = int(arcpy.GetCount_management(aoi_fesatureset)[0])

        #   If AOI is provided, but it has no features, perfrom the Shapefile
        #   to AOI task. Else perform Analysis.
        if aoi_feature_count == 0:
            arcpy.AddMessage("0 features found in aoi." +
                             " Performing ShapeFile To AOI...")
            out_featureset = shapefile_to_aoi()

            #   Set generated featrue set as output AOI
            arcpy.SetParameter(2, out_featureset)
            #   Keep second output parameter as blank, as we are not generating
            #   summary table here
            arcpy.SetParameter(3, "")

        #   If valid AOI is provided, perform analysis
        elif aoi_feature_count > 0:
            arcpy.AddMessage("Area of Interest provided." +
                             " Performing Analyze Shapefile...")

            #   Create feature set out of provided shape file
            featureset = create_featureset()
            if not featureset:
                return

            #   Check type of shapefile and required units
            feature_type = check_feature_type(featureset)
            if not feature_type:
                return

            #   Set the Table header of output summary table as per geometry
            #   type of shapefile
            feature_details = set_table_header(feature_type)

            #   Create summary table of required fields
            summary_table = create_summary_table(feature_details)

            #   sumup parameters
            summarized_value = tabulate_intersection(
                featureset, feature_type, area_of_interest, feature_details)

            #   Add summarized value to output table
            out_table = add_value(summarized_value, feature_type,
                                  feature_details, summary_table)

            #   Set generated Summary table as output.
            arcpy.SetParameter(3, out_table)

            #   Keep first output parameter blank, as we are not generating
            #   AOI feature set here
            arcpy.SetParameter(2, "")

if __name__ == '__main__':
    main()

