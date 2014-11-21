/*global define */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
 | Copyright 2013 Esri
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
 */
define({
    showNullValue: "@it@ N/A",
    buttons: {
        okButtonText: "@it@ OK",
        link: "@it@ Link",
        email: "@it@ e-mail",  // Shown next to icon for sharing the current map extents via email; works with shareViaEmail tooltip
        facebook: "Facebook",  // Shown next to icon for sharing the current map extents via a Facebook post; works with shareViaFacebook tooltip
        twitter: "Twitter",  // Shown next to icon for sharing the current map extents via a Twitter tweet; works with shareViaTwitter tooltip
        embedding: "@it@ Embedded URL",
        go: "@it@ Go",
        browse: "@it@ Browse",
        upload: "@it@ Upload",
        add: "@it@ Add",
        locate: "@it@ Locate",
        downLoad: "@it@ Download"
    },
    tooltips: {
        search: "Cerca",
        reports: "@it@ Reports",
        locate: "Posizione corrente",
        share: "Condividi",
        help: "Guida",
        clearEntry: "@it@ Clear",
        selectInitialCoordinates: "@it@ Select Initial Coordinates",
        loadingText: "@it@ Loading...",
        settingsIconTitle: "@it@ Choose fields to view in summary report",
        selectFeature: "@it@ Click on a feature to select",
        completeFeatureSelection: "@it@ Press double click to finish the opertaion",
        selectCoordinates: "@it@ Please select the point",
        clearAOI: "@it@ clear AOI"
    },
    titles: {
        areaOfInterestTabText: "@it@ Area of Interest",
        reportTabText: "@it@ Report",
        webpageDisplayText: "@it@ Copy/Paste HTML into your web page",
        pointToolText: "@it@ Point",
        multipointToolText: "@it@ Multipoint",
        lineToolText: "@it@ Line",
        rectangleToolText: "@it@ Rectangle",
        polygonToolText: "@it@ Polygon",
        selectFeatureText: "@it@ Select features",
        areaStandardUnit: "@it@ acres",
        lengthStandardUnit: "@it@ Miles",
        lengthMetricUnit: "@it@ Kilometer",
        areaMetricUnit: "@it@ Sq.Km.",
        lengthMetricUnitLabel: "@it@ Km",
        standardUnitLabel: "@it@ Standard Units",
        standardReportUnit: "@it@ Standard",
        metricUnitLabel: "@it@ Show areas in ",
        unitLabel: "@it@ Metric Units",
        uploadShapeFile: "@it@ Upload Shapefile to include in analysis",
        drawAOIBeforeUpload: "@it@ (Please draw an AOI before uploading)",
        downLoadReport: "@it@ Download Report",
        data: "@it@ Data",
        selectFormat: "@it@ Select Format",
        selectType: "@it@ Select Type",
        pdfReport: "@it@ PDF",
        fileGDBReport: "@it@ File GDB",
        excelReport: "@it@ Excel",
        quickSummary: "@it@ Quick Summary",
        deatiledSummary: "@it@ Detailed Summary",
        drawingToolUnifiedSearchTitle: "@it@ Navigate to geography",
        placeNameTtile: "@it@ Placename",
        drawingTitle: "@it@ Draw",
        uploadShapefileTitle: "@it@ Shapefile",
        coordinatesTitle: "@it@ Coordinates ",
        distanceLabel: "@it@ Distance",
        bearingLabel: "@it@ Bearing",
        quickReport: "@it@ Quick Report",
        detailedReport: "@it@ Detailed Report"
    },
    messages: {
        legendLoadingText: "@it@ Loading...",
        noLegend: "@it@ No Legend Available",
        sliderDisplayText: "@it@ Show results within ${defaultDistance}",
        aoiOptionsText: "@it@ Define AOI by using",
        uploadShapefileText: "@it@ Upload a zipped shapefile to define your AOI",
        coordinatesText: "@it@ Enter coordinates, bearing and distance",
        drawToolsText: "@it@ Use the Drawing tools to define your AOI",
        bufferSliderText: "@it@ Buffer distance (Optional for polygon AOIs)",
        placeNameSearchText: "@it@ Use an address to define your AOI",
        radioBtnMiles: "@it@ Miles",
        radioBtnFeet: "@it@ Feet",
        radioBtnMeters: "@it@ Meters",
        radioBtnKilometers: "@it@ Kilometers",
        bearingContainerTitle: "@it@ Bearing and Distance",
        bearingContainerText: "@it@ Define Start point using address search",
        startPoint: "@it@ Click on map to select start point",
        orText: "@it@ OR",
        latitude: "@it@ Latitude",
        longitude: "@it@ Longitude",
        bearing: "@it@ Bearing",
        bearingValue: "@it@ (0-360)",
        distance: "@it@ Distance (Miles)",
        reportPanelHeader: "@it@ Summary Report for Area of Interest",
        selectReportFields: "@it@ Select report fields"
    },
    errorMessages: {
        invalidSearch: "Nessun risultato trovato.",
        falseConfigParams: "Valori chiave di configurazione obbligatori sono null o non esattamente corrispondenti con gli attributi di livello. Questo messaggio può apparire più volte.",
        invalidLocation: "@it@ Current location not found.",
        invalidProjection: "@it@ Unable to plot current location on the map.",
        widgetNotLoaded: "@it@ Unable to load widgets.",
        shareFailed: "@it@ Unable to share.",
        emptyInfoWindowTitle: "@it@ No feature details",
        emptyInfoWindowContent: "@it@ InfoWindow is disabled for the selected layer in webmap.",
        bufferSliderValue: "@it@ Buffer slider should not be set to zero distance",
        addLatitudeValue: "@it@ Please enter valid Latitude",
        addLongitudeValue: "@it@ Please enter valid Longitude.",
        addLatitudeandLongitudeValue: "@it@ Please enter valid Latitude and Longitude",
        addBearingValue: "@it@ Please add Bearing value.",
        addDistanceMiles: "@it@ Please add Valid distance in ${0}.",
        distanceMaxLimit: "@it@ Please specify distance between 0 to ${0}.",
        errorPerfomingQuery: "@it@ Error performing query operation",
        esriJobFailMessage: "@it@ Failed to generate AOI from shapefile",
        esriJobFailToAnlayse: "@it@ Failed to execute (AnalyseShapefile)",
        esriJobFailToGenerateReport: "@it@ Failed to generate Report",
        defineAOI: "@it@ Please define AOI to generate the report.",
        invalidGeometry: "@it@ Invalid geometry.",
        noFeaturesFound: "@it@ Features not found.",
        browseFile: "@it@ Please browse to a file.",
        noFeaturesInAOI: "@it@ No features found in AOI.",
        noFieldsSelected: "@it@ No fields selected.",
        reportFormat: "@it@ Please Select the Report Format",
        selectFeatureError: "@it@ Please double click on map to complete the select Feature.",
        inValideNumericErrorMessage: "@it@ Please enter valid inputs.",
        inValideZipFile: "@it@ Incorrect File extension\n Should be zip",
        portalUrlNotFound: "@it@ Portal URL cannot be empty",
        searchTextErrorMessage: "@it@ Please enter inputs to search",
	    queryRequestStringExceeded : "@it@ The length of the query string for this request exceeds the configured maxQueryStringLength value.",
	    defineStartPointMessage : "@it@ Please define start point",
        unableToShareURL : "@it@ Application could not be shared with current data"
    },
    // End of shared nls

    //App nls
    appErrorMessage: {
        layerTitleError: "@it@ Title and/or QueryLayerId parameters in SearchSettings do not match with configured operational layers.",
        titleNotMatching: "@it@ Title and/or QueryLayerId parameters in the InfoWindowSettings and SearchSettings do not match.",
        lengthDoNotMatch: "@it@ The number of objects in InfoWindowSettings and SearchSettings do not match.",
        webmapTitleError: "@it@ Title and/or QueryLayerId parameters in SearchSettings do not match with configured webmap"
    }
    //End of App nls
});
