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
    showNullValue: "@fr@ N/A",
    buttons: {
        okButtonText: "@fr@ OK",
        link: "@fr@ Link",
        email: "Email",  // Shown next to icon for sharing the current map extents via email; works with shareViaEmail tooltip
        facebook: "Facebook",  // Shown next to icon for sharing the current map extents via a Facebook post; works with shareViaFacebook tooltip
        twitter: "Twitter",  // Shown next to icon for sharing the current map extents via a Twitter tweet; works with shareViaTwitter tooltip
        embedding: "@fr@ Embedded URL",
        go: "@fr@ Go",
        browse: "@fr@ Browse",
        upload: "@fr@ Upload",
        add: "@fr@ Add",
        locate: "@fr@ Locate",
        downLoad: "@fr@ Download"
    },
    tooltips: {
        search: "Rechercher",
        reports: "@fr@ Reports",
        locate: "Emplacement actuel",
        share: "Partager",
        help: "Aide",
        clearEntry: "@fr@ Clear",
        selectInitialCoordinates: "@fr@ Select Initial Coordinates",
        selectFeature: "@fr@ Click on a feature to select",
        completeFeatureSelection: "@fr@ Press double click to finish the opertaion",
        selectCoordinates: "@fr@ Please select the point",
        clearAOI: "@fr@ clear AOI",
        reportFields: "@fr@ Configure attributes to display"
    },
    titles: {
        webpageDisplayText: "@fr@ Copy/Paste HTML into your web page",
        pointToolText: "@fr@ Point",
        lineToolText: "@fr@ Line",
        rectangleToolText: "@fr@ Rectangle",
        polygonToolText: "@fr@ Polygon",
        selectFeatureText: "@fr@ Select features",
        areaStandardUnit: "@fr@ acres",
        lengthStandardUnit: "@fr@ Miles",
        lengthMetricUnit: "@fr@ Kilometer",
        areaMetricUnit: "@fr@ Sq.Km.",
        lengthMetricUnitLabel: "@fr@ Km",
        standardUnitLabel: "@fr@ Standard Units",
        metricUnitLabel: "@fr@ Show areas in ",
        unitLabel: "@fr@ Metric Units",
        uploadShapeFile: "@fr@ Upload Shapefile to include in analysis",
        drawAOIBeforeUpload: "@fr@ (Please draw an AOI before uploading)",
        downLoadReport: "@fr@ Download Report",
        selectFormat: "@fr@ Select Format:",
        selectType: "@fr@ Select Type:",
        summaryReportTitle: "@fr@ Summary Report Title:",
        distanceLabel: "@fr@ Distance",
        bearingLabel: "@fr@ Bearing",
        reportTitleValue: "@fr@ Area of Interest (AOI) Information"
    },
    messages: {
        legendLoadingText: "@fr@ Loading...",
        noLegend: "@fr@ No Legend Available",
        sliderDisplayText: "@fr@ Show results within",
        bufferSliderText: "@fr@ Buffer distance (Optional for polygon AOIs)",
        orText: "@fr@ OR",
        latitude: "@fr@ Latitude",
        longitude: "@fr@ Longitude",
        bearing: "@fr@ Bearing",
        bearingValue: "@fr@ (0-360)",
        distance: "@fr@ Distance (Miles)",
        reportPanelHeader: "@fr@ Summary Report for Area of Interest",
        selectReportFields: "@fr@ Select report fields",
        reportLoadingText: "@fr@ Generating report. Please wait..."
    },
    errorMessages: {
        invalidSearch: "Aucun résultat",
        falseConfigParams: "Valeurs clés de configuration requis sont null ou pas exactement correspondant à des attributs de la couche. Ce message peut apparaître plusieurs fois.",
        invalidLocation: "@fr@ Current location not found.",
        invalidProjection: "@fr@ Unable to plot current location on the map.",
        widgetNotLoaded: "@fr@ Unable to load widgets.",
        shareFailed: "@fr@ Unable to share.",
        emptyInfoWindowTitle: "@fr@ No feature details",
        emptyInfoWindowContent: "@fr@ InfoWindow is disabled for the selected layer.",
        bufferSliderValue: "@fr@ Buffer slider should not be set to zero distance",
        addLatitudeValue: "@fr@ Please enter valid Latitude",
        addLongitudeValue: "@fr@ Please enter valid Longitude.",
        addLatitudeandLongitudeValue: "@fr@ Please enter valid Latitude and Longitude",
        addBearingValue: "@fr@ Please specify bearing values between 0 to 360 degrees.",
        addDistanceMiles: "@fr@ Please add valid distance in ${0}.",
        distanceMaxLimit: "@fr@ Please specify distance between 0 to ${0}.",
        errorPerfomingQuery: "@fr@ Error performing query operation",
        esriJobFailMessage: "@fr@ Failed to generate AOI from shapefile",
        esriJobFailToAnlayse: "@fr@ Failed to execute (AnalyseShapefile)",
        esriJobFailToGenerateReport: "@fr@ Failed to generate Report",
        defineAOI: "@fr@ Please define AOI to generate the report.",
        invalidGeometry: "@fr@ Invalid geometry.",
        noFeaturesFound: "@fr@ Features not found.",
        browseFile: "@fr@ Please browse to a file.",
        noFeaturesInAOI: "@fr@ No features found in AOI.",
        noFieldsSelected: "@fr@ No fields selected.",
        selectFeatureError: "@fr@ Please double click on map to complete the select Feature.",
        inValideNumericErrorMessage: "@fr@ Please enter valid inputs.",
        inValideZipFile: "@fr@ Incorrect File extension\n Should be zip",
        portalUrlNotFound: "@fr@ Portal URL cannot be empty",
	    queryRequestStringExceeded : "@fr@ The length of the query string for this request exceeds the configured maxQueryStringLength value.",
	    defineStartPointMessage : "@fr@ Please define start point",
        unableToShareURL : "@fr@ Application could not be shared with current data",
        getLayerInfoError: "@fr@ Unable to get layer info for layer",
        simplifyGeometryFailed: "@fr@ Failed to simplify geometry",
        incorrectFields: "@fr@ Incorrect fields configured",
        noFieldsConfigured: "@fr@ No fields configured",
        incorrectStatisticFieldUnit: "@fr@ Incorrect Statistic field unit specified for ",
        unionGeometryFailed: "@fr@ Failed to union geometry"
    },
    // End of shared nls

    //App nls
    appErrorMessage: {
        layerTitleError: "@fr@ Title and/or QueryLayerId parameters in SearchSettings do not match with configured operational layers.",
        titleNotMatching: "@fr@ Title and/or QueryLayerId parameters in the InfoWindowSettings and SearchSettings do not match.",
        lengthDoNotMatch: "@fr@ The number of objects in InfoWindowSettings and SearchSettings do not match.",
        webmapTitleError: "@fr@ Title and/or QueryLayerId parameters in SearchSettings do not match with configured webmap"
    }
    //End of App nls
});
