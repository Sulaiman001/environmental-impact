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

import arcpy, os, zipfile, sys

arcpy.env.overwriteOutput = True
SCRATCH = arcpy.env.scratchFolder

#   extracting zip files
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

        # Closing zip file to release the lock on it
        zip_data.close()
        return True   #os.path.basename(zip_file_name)[:-4]

    except (zipfile.BadZipfile) as error:
        arcpy.AddError("ERROR occured while extracting ZIP : " + str(error))
        return False

#   performing analysis
def shapefile_to_aoi():
    """This function dissolves the extracted shapefile and returns featureset"""
    try:
        found_shp = False
        for shape_file in os.listdir(SCRATCH):
            if shape_file.endswith(".shp") :
                found_shp = True
                shapefile_path = os.path.join(SCRATCH, shape_file)
                arcpy.AddMessage("Found shapefile: {0}".format(shapefile_path))
                arcpy.AddMessage("Dissolving extracted shapefile...")
                output_fc_name = os.path.join(SCRATCH, "outdissolve.shp")
                arcpy.Dissolve_management(shapefile_path, output_fc_name)
                #  Loading extracted shape file into feature set to be returned
                #  as Output Parameter
                out_featureset = arcpy.FeatureSet()
                out_featureset.load(output_fc_name)
                arcpy.AddMessage("Complete.")
                return out_featureset

        if not found_shp:
            arcpy.AddError("Could not find valid shapefile in uploaded zip.")
            return False

    except Exception as error:
        arcpy.AddError("Error:" + str(error))
        return False

def main():
    """Main Function"""
    #   Variable to define Input parameter
    zip_file_name = arcpy.GetParameterAsText(0)

    valid_zip =  extract_zip(zip_file_name)

    if not valid_zip:
        return

    outFeatureset = shapefile_to_aoi()

    if not outFeatureset:
        arcpy.AddError("No output features found.")
        return
    else:
        arcpy.SetParameter(1, outFeatureset)

if __name__ == '__main__':
    main()




