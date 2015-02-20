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
#   pylint: disable = E1101, E1103, W0703, R0914

import arcpy
import os
import xlwt
import zipfile

SCRATCH = arcpy.env.scratchFolder
OUTPUT_ZIPFILE = "ClipAnalysisOutput"
arcpy.env.overwriteOutput = True

def loop_req_layers(layers_to_clip, area_of_interest):
    """ This function loop through all the layers provided and generate the
    excel file. """
    try:
        #   Download data for layers in mxd.
        layers = layers_to_clip.split(";")
        arcpy.AddMessage("Downloading data for layers...")
        for item in layers:
            if str(item)[0] in ['"', "'"] or str(item)[-1] in ['"', "'"]:
                lyr = str(item)[1:-1]
            else:
                lyr = str(item)
            data_type = arcpy.Describe(lyr).DataType.lower()

            #   Consider only layers of type Feature Layer
            if data_type == "featurelayer":
                layer_name = arcpy.Describe(lyr).name
                arcpy.AddMessage("Clipping {0} layer...".format(layer_name))
                _ = generate_excel(layer_name, area_of_interest, lyr)
            else:
                arcpy.AddWarning("Layer is not a feature layer")
                arcpy.AddWarning("Skipping {0}".format(lyr))

        return True

    except Exception as error:
        arcpy.AddError(error)
        return False

def generate_excel(name, area_of_interest, in_features):
    """ This function first performs the Clip Analysis for provided layer.
    Once the analysis is complete it generates the excel file ( .xls) having
    all attributes of clipped data. """
    valid_out_feature_name = arcpy.ValidateTableName(name[:-4] + "_Clip",
                                                     SCRATCH)
    output_feature = os.path.join(SCRATCH, valid_out_feature_name)
    try:
        #   Perform Clip analysis for input layer
        shp_data = arcpy.Clip_analysis(in_features, area_of_interest,
                                       output_feature)

        shp_data_count = int(arcpy.GetCount_management(shp_data)[0])
        if shp_data_count == 0:
            arcpy.AddMessage(("No features found in {0} after Clip Analysis.")
                             .format(name))
            return
        else:
            #   Remove fields from output which are not required
            desc = arcpy.Describe(shp_data)
            fieldnames = [f.name for f in desc.fields if f.type not in\
                          ["Geometry", "Raster", "Blob", "ID"] and
                          not f.name.startswith("FID_")]

            #   Specify excel file path
            xlsx_file_path = os.path.join(SCRATCH, (name)[:-4] + ".xls")

            #   Create new workbook
            workbook = xlwt.Workbook()

            #   Add new sheet in excel file
            worksheet = workbook.add_sheet("Sheet1")
            work_row = 0
            work_col = 0

            #   Write Field names as headers
            for fld in fieldnames:
                worksheet.write(work_row, work_col, str(fld))
                work_col += 1

            #   Write values to each cell of excel
            with arcpy.da.SearchCursor(shp_data, fieldnames) as cursor:
                val_row = 1
                for row in cursor:
                    val_col = 0
                    for val in row:
                        worksheet.write(val_row, val_col, str(val))
                        val_col += 1
                    val_row += 1
            workbook.save(xlsx_file_path)
            return True
    except Exception:
        arcpy.AddError(("Error occurred while generating excel for {0}.")
                       .format((name)))
        return False

def create_zip_folder():
    """ This function creates the zip file for output containing all the excel
    files generated """
    try:
        arcpy.AddMessage("Zipping output...")

        #   Specify output zip file path
        out_zip_file = os.path.join(SCRATCH, OUTPUT_ZIPFILE + ".zip")

        # Delete zip file if exists
        if os.path.exists(out_zip_file):
            os.remove(out_zip_file)

        #   Open zip file in write mode
        zipobj = zipfile.ZipFile(out_zip_file, 'w')

        #   Search for each excel file in SCRATCH and write it to zip file
        for filename in os.listdir(SCRATCH):
            if filename.endswith(".xls"):
                zipobj.write(os.path.join(SCRATCH, filename),
                             os.path.basename(filename))

        #   Close zip file to release the lock
        zipobj.close()
        arcpy.AddMessage("Zip file created.")
        return out_zip_file

    except Exception:
        arcpy.AddError("Error occurred while creating zip file.")
        return False

def main():
    """ Main Function """
    #   Input Parameters
    layers_to_clip = arcpy.GetParameterAsText(0)
    area_of_interest = arcpy.GetParameter(1)

    #   Check if valid AOI is provided. It should have at least 1 polygon
    #   feature
    aoi_featset = arcpy.FeatureSet()
    aoi_featset.load(area_of_interest)
    aoi_feat_count = int(arcpy.GetCount_management(aoi_featset)[0])

    if aoi_feat_count == 0:
        arcpy.AddError("Provided AOI has no polygon features." +
                       " Please provide valid AOI for analysis.")
        return

    #   Download data for provided layers
    layers_success = loop_req_layers(layers_to_clip, area_of_interest)
    if not layers_success:
        return

    #   Create zip file of generated excel files for output
    output_zip_file = create_zip_folder()
    if not output_zip_file:
        return
    else:
        # Set generated zip file as output
        arcpy.AddMessage("Zip file created at : " + str(output_zip_file))
        arcpy.SetParameter(2, output_zip_file)

if __name__ == '__main__':
    main()
