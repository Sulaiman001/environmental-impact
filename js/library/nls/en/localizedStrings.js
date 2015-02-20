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
    showNullValue: "N/A",
    buttons: {
        okButtonText: "OK",
        link: "Link",
        email: "Email",  // Shown next to icon for sharing the current map extents via email; works with shareViaEmail tooltip
        facebook: "Facebook",  // Shown next to icon for sharing the current map extents via a Facebook post; works with shareViaFacebook tooltip
        twitter: "Twitter",  // Shown next to icon for sharing the current map extents via a Twitter tweet; works with shareViaTwitter tooltip
        embedding: "Embedded URL",
        go: "Go",
        browse: "Browse",
        upload: "Upload",
        add: "Add",
        locate: "Locate",
        downLoad: "Download"
    },
    tooltips: {
        search: "Search",
        reports: "Reports",
        locate: "Locate",
        share: "Share",
        help: "Help",
        clearEntry: "Clear",
        selectInitialCoordinates: "Select Initial Coordinates",
        selectFeature: "Click on a feature to select",
        completeFeatureSelection: "Press double click to finish the opertaion",
        clearAOI: "clear AOI",
        reportFields: "Configure attributes to display"
    },
    titles: {
        webpageDisplayText: "Copy/Paste HTML into your web page",
        pointToolText: "Point",
        lineToolText: "Line",
        rectangleToolText: "Rectangle",
        polygonToolText: "Polygon",
        selectFeatureText: "Select features",
        areaStandardUnit: "acres",
        lengthStandardUnit: "Miles",
        lengthMetricUnit: "Kilometer",
        areaMetricUnit: "Sq.Km.",
        lengthMetricUnitLabel: "Km",
        standardUnitLabel: "Standard Units",
        metricUnitLabel: "Show areas in ",
        unitLabel: "Metric Units",
        uploadShapeFile: "Upload Shapefile to include in analysis",
        drawAOIBeforeUpload: "(Please draw an AOI before uploading)",
        downLoadReport: "Download Report",
        selectFormat: "Select Format:",
        selectType: "Select Type:",
        summaryReportTitle: "Summary Report Title:",
        distanceLabel: "Distance",
        bearingLabel: "Bearing",
        reportTitleValue: "Area of Interest (AOI) Information"
    },
    messages: {
        legendLoadingText: "Loading...",
        noLegend: "No Legend Available",
        sliderDisplayText: "Show results within",
        bufferSliderText: "Buffer distance (Optional for polygon AOIs)",
        orText: "OR",
        latitude: "Latitude",
        longitude: "Longitude",
        bearing: "Bearing",
        bearingValue: "(0-360)",
        distance: "Distance",
        reportPanelHeader: "Summary Report for Area of Interest",
        selectReportFields: "Select report fields",
        reportLoadingText: "Generating report. Please wait..."
    },
    errorMessages: {
        invalidSearch: "No results found",
        falseConfigParams: "Required configuration key values are either null or not exactly matching with layer attributes. This message may appear multiple times.",
        invalidLocation: "Current location not found.",
        invalidProjection: "Unable to plot current location on the map.",
        widgetNotLoaded: "Unable to load widgets.",
        shareFailed: "Unable to share.",
        emptyInfoWindowTitle: "No feature details",
        emptyInfoWindowContent: "InfoWindow is disabled for the selected layer.",
        bufferSliderValue: "Buffer slider should not be set to zero distance",
        addLatitudeValue: "Please enter valid Latitude",
        addLongitudeValue: "Please enter valid Longitude.",
        addLatitudeandLongitudeValue: "Please enter valid Latitude and Longitude",
        addBearingValue: "Please specify bearing values between 0 to 360 degrees",
        addDistanceMiles: "Please add valid distance in ${0}.",
        distanceMaxLimit: "Please specify distance between 0 to ${0}.",
        errorPerfomingQuery: "Error performing query operation",
        esriJobFailMessage: "Failed to generate AOI from shapefile",
        esriJobFailToAnlayse: "Failed to execute (AnalyseShapefile)",
        esriJobFailToGenerateReport: "Failed to generate Report",
        defineAOI: "Please define AOI to generate the report.",
        invalidGeometry: "Invalid geometry.",
        noFeaturesFound: "Features not found.",
        browseFile: "Please browse to a file.",
        noFeaturesInAOI: "No features found in AOI.",
        noFieldsSelected: "No fields selected.",
        selectFeatureError: "Please double click on map to complete the select Feature.",
        inValideNumericErrorMessage: "Please enter valid input",
        inValideZipFile: "Incorrect File extension\n Should be zip",
        portalUrlNotFound: "Portal URL cannot be empty",
	    queryRequestStringExceeded : "The length of the query string for this request exceeds the configured maxQueryStringLength value.",
	    defineStartPointMessage : "Please define start point",
        unableToShareURL : "Application could not be shared with current data",
        getLayerInfoError: "Unable to get layer info for layer",
        simplifyGeometryFailed: "Failed to simplify geometry",
        incorrectFields: "Incorrect fields configured",
        noFieldsConfigured: "No fields configured",
        incorrectStatisticFieldUnit: "Incorrect Statistic field unit specified for ",
        unionGeometryFailed: "Failed to union geometry"
    },
    // End of shared nls

    //App nls
    appErrorMessage: {
        layerTitleError: "Title and/or QueryLayerId parameters in SearchSettings do not match with configured operational layers.",
        titleNotMatching: "Title and/or QueryLayerId parameters in the InfoWindowSettings and SearchSettings do not match.",
        lengthDoNotMatch: "The number of objects in InfoWindowSettings and SearchSettings do not match.",
        webmapTitleError: "Title and/or QueryLayerId parameters in SearchSettings do not match with configured webmap"
    }
    //End of App nls
});
