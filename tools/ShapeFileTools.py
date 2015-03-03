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

#   pylint: disable = E1101, E1103, W0703, W0141, R0914

import arcpy, os, zipfile, shutil
arcpy.env.overwriteOutput = True

SCRATCH = arcpy.env.scratchFolder

def extract_zip(zip_file_name):
    """
    This function copies the contents of zip file in scratch workspace
    and returns the shapefile path.
    """
    try:
        with zipfile.ZipFile(zip_file_name, "r") as zip_file:
            for name in zip_file.namelist():
                file_name = os.path.basename(name)
                source = zip_file.open(name)
                target = file(os.path.join(SCRATCH, file_name), "wb")
                with source, target:
                    shutil.copyfileobj(source, target)
                if file_name.endswith(".shp"):
                    shape_file_name = target.name
        return os.path.join(SCRATCH, shape_file_name)

    except (zipfile.BadZipfile) as error:
        arcpy.AddError("ERROR occurred while extracting ZIP : " + str(error))
        return False


def shapefile_to_aoi(shape_file_path):
    """This function dissolves the extracted shapefile and returns it"""
    try:
        shape_file_name = os.path.basename(shape_file_path)[:-4]
        arcpy.AddMessage("Found shapefile: {0}".format(shape_file_path))
        arcpy.AddMessage("Dissolving extracted shapefile...")
        valid_output_name = arcpy.ValidateTableName(
            shape_file_name + "_Output", "in_memory")
        output_fc_name = os.path.join("in_memory", valid_output_name)
        arcpy.Dissolve_management(shape_file_path, output_fc_name)
        #  Loading extracted shape file into feature set to be returned
        #  as Output Parameter
        arcpy.AddMessage("Complete.")
        return output_fc_name

    except Exception as error:
        arcpy.AddError("Error:" + str(error))
        return False


def get_feature_set_details(shape_file_path):
    """ This function gets the shape type of the shapefile and make a list
    of fields to be added to output summary table based on that shape type """
    try:
        #   Checking for geometry type
        feat_desc = arcpy.Describe(shape_file_path)
        arcpy.AddMessage(("Shapefile is of '{0}' type.")
                         .format(str(feat_desc.shapeType)))

        #   According to shape type kame a list of fields to be added to
        #   summary table
        list_of_fields = ["summaryfield", "summaryvalue"]
        if feat_desc.shapeType.upper() == "POLYGON":
            list_of_fields += ["area_acres", "area_sqkm"]

        elif feat_desc.shapeType.upper() == "POLYLINE":
            list_of_fields += ["length_Miles", "length_Km"]

        elif feat_desc.shapeType.upper() == "POINT":
            list_of_fields += ["Count"]

        return [feat_desc.shapeType, list_of_fields]

    except Exception as error:
        arcpy.AddError("Error occurred during execution:" + str(error))


def create_summary_table(table_fields):
    """This function creates the output summary table """
    try:
        #   Create the output summary table
        arcpy.AddMessage("Generating Summary Table...")
        valid_table_name = arcpy.ValidateTableName("summary_table", "in_memory")
        summary_table = arcpy.CreateTable_management("in_memory",
                                                     valid_table_name)

        #   Add the fields to Summary table
        for fldname in table_fields:
            arcpy.AddField_management(summary_table, fldname, "TEXT")
        arcpy.AddMessage("Summary Table is created.")
        return summary_table
    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occurred during execution:" + str(error))


def clip_and_statistic(in_features, area_of_interest):

    """
    This function first clip the dissoled shapefile with the provided AOI.
    Then it adds the fields in clipped feature class (not for POINT shpe type)
    to store the Area/Length in standard units (Acres/Miles) and Metric units
    (SqKm/Km).
    It performs the Statistic Anlysis of each of the fields from clipped feature
    class except ObjectID Field, shape field and newly added fields in case
    of POLYLINE and POLYGON.
    """
    try:
        #   Maintain a dict to store field names & field calculation expressions
        #   for standard and metric units
        area_acre_exp = "!SHAPE.AREA@ACRES!"
        area_sqkm_exp = "!SHAPE.AREA@SQUAREKILOMETERS!"
        length_miles_exp = "!SHAPE.LENGTH@MILES!"
        length_meter_exp = "!SHAPE.LENGTH@KILOMETERS!"
        shape_dict = {"POLYGON" : ["area_acre", area_acre_exp, "area_sqkm",
                                   area_sqkm_exp],
                      "POLYLINE" : ["lgth_miles", length_miles_exp, "lgth_kms",
                                    length_meter_exp]}

        feature_desc = arcpy.Describe(in_features)
        shape = feature_desc.shapeType

        #   Validate the name of output feature class after clip analysis
        shape_file_name = os.path.basename(in_features)[:-4]
        valid_out_feature_name = arcpy.ValidateTableName(
            shape_file_name + "_clip", "in_memory")
        clipped_features = os.path.join("in_memory", valid_out_feature_name)
        arcpy.Clip_analysis(in_features, area_of_interest, clipped_features)

        #   Add fields in the clipped feature class to store the Area/Length
        #   in required units (applicablt only for Polygons and Polylines
        #   Assiging shape_in_standard and shape_in_metric to None, as in case
        #   of POINT shape file, both will not get initialized and will not
        #   get referenced while listing the fields of clipped feature
        shape_in_standard = None
        shape_in_metric = None
        if shape.upper() in ["POLYGON", "POLYLINE"]:
            # Add field for standard units
            shape_in_standard = arcpy.ValidateFieldName(
                shape_dict[shape.upper()][0], clipped_features)
            arcpy.AddField_management(clipped_features, shape_in_standard,
                                      "DOUBLE")
            arcpy.CalculateField_management(clipped_features, shape_in_standard,
                                            shape_dict[shape.upper()][1],
                                            "PYTHON_9.3")

            #   Add field for metric units
            shape_in_metric = arcpy.ValidateFieldName(
                shape_dict[shape.upper()][2], clipped_features)
            arcpy.AddField_management(clipped_features, shape_in_metric,
                                      "DOUBLE")
            arcpy.CalculateField_management(clipped_features, shape_in_metric,
                                            shape_dict[shape.upper()][3],
                                            "PYTHON_9.3")

            #   Fields to send for StatisticAnalysis with summary type as "SUM"
            stat_fields = [[shape_in_standard, "SUM"], [shape_in_metric, "SUM"]]

        elif shape.upper() == "POINT":
            #   For Point feature class, consider its OID field for statistic
            oid_field_name = arcpy.Describe(clipped_features).OIDFieldName
            stat_fields = [[oid_field_name, "SUM"]]


        #   Get the list of all fields of clipped output
        fields = [field for field in arcpy.ListFields(clipped_features)\
                    if not field.required and\
                    not (field.name.upper()).startswith("SHAPE") and\
                    field.name not in [shape_in_standard, shape_in_metric]]
        arcpy.AddMessage("{0} fields found.".format(str(len(fields))))

        #   Maintain a dict to store statistic table created for each field
        summary_tables_dict = {}
        for field in fields:
            #   Validate the name of the Statistic table created for each field
            valid_table_name = arcpy.ValidateTableName(
                field.name + "_sumtable", "in_memory")
            out_stat_table = os.path.join("in_memory", valid_table_name)
            out_stat_table = arcpy.Statistics_analysis(
                clipped_features, out_stat_table, stat_fields, field.name)[0]

            #   Store the generated statistic table into dict
            summary_tables_dict[field.name] = out_stat_table

        return summary_tables_dict

    except arcpy.ExecuteError as error:
        arcpy.AddError("Error occurred during execution:" + str(error))


def add_value(summary_tables_list, feature_details, summary_table):
    """
    This function will help to add summarised value to created summary table"""
    try:
        #   Values from each field's summary table will be added to final
        #   Summary table
        for key, value in summary_tables_list.items():
            search_fields = [str(field.name) for field in \
                             arcpy.ListFields(value) if not field.required]

            #   If the shape file is not of POINT type, FEQUENCY field, added
            #   after statistic analysis is not required further
            if feature_details[0].upper() != "POINT":
                search_fields.remove("FREQUENCY")
                row_len = len(search_fields)
            #   For POINT shape file, the SUM field is not required
            elif feature_details[0].upper() == "POINT":
                row_len = len(search_fields[:-1])

            #   Add each row of each table in final summary table
            with arcpy.da.SearchCursor(value, search_fields) as s_cursor:
                for row in s_cursor:
                    insert_row = [key]
                    for i in xrange(row_len):
                        insert_row += [str(row[i])]
                    #   Insert the values in summary table
                    with arcpy.da.InsertCursor(summary_table,
                                               feature_details[1])\
                                               as insert_cursor:
                        insert_cursor.insertRow(insert_row)

        arcpy.AddMessage("Summarized values added to Summary Table.")
        return summary_table

    except Exception as error:
        arcpy.AddError("Error occurred during execution:" + str(error))


def main():
    """ Main Function """
    #   Input parameters
    zip_file_name = arcpy.GetParameterAsText(0)
    area_of_interest = arcpy.GetParameterAsText(1)

    #   Extract the uploaded zip file
    shape_file_path = extract_zip(zip_file_name)

    if not shape_file_path:
        return

    #   If AOI is not provided, perform Shapefile to AOI task
    if area_of_interest == "":
        arcpy.AddMessage("Area of Interest not provided." +
                         " Performing ShapeFile To AOI...")
        out_featureset = shapefile_to_aoi(shape_file_path)
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
        aoi_feature_count = int(arcpy.GetCount_management(area_of_interest)[0])

        #   If AOI is provided, but it has no features, perform the Shapefile
        #   to AOI task. Else perform Analysis.
        if aoi_feature_count == 0:
            arcpy.AddMessage("0 features found in aoi." +
                             " Performing ShapeFile To AOI...")
            out_featureset = shapefile_to_aoi(shape_file_path)

            #   Set generated feature set as output AOI
            arcpy.SetParameter(2, out_featureset)

            #   Keep second output parameter as blank, as we are not generating
            #   summary table here
            arcpy.SetParameter(3, "")

        #   If valid AOI is provided, perform analysis
        elif aoi_feature_count > 0:
            arcpy.AddMessage("Area of Interest provided." +
                             " Performing Analyse Shapefile...")

            #   Get the table header list and shape type of the shape file
            feature_details = get_feature_set_details(shape_file_path)

            #   Create summary table of required fields
            summary_table = create_summary_table(feature_details[1])

            #   Perform clip and analysis on shape file with provided AOI.
            #   Get the summary tables for each of the field
            summary_tables_list = clip_and_statistic(
                shape_file_path, area_of_interest)

            #   Add summarized value to output table
            out_table = add_value(summary_tables_list, feature_details,
                                  summary_table)

            #   Set generated Summary table as output.
            arcpy.SetParameter(3, out_table)

            #   Keep first output parameter blank, as we are not generating
            #   AOI feature set here
            arcpy.SetParameter(2, "")

if __name__ == '__main__':
    main()
