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
    showNullValue: "@es@ N/A",
    buttons: {
        okButtonText: "@es@ OK",
        link: "@es@ Link",
        email: "correo electrónico",  // Shown next to icon for sharing the current map extents via email; works with shareViaEmail tooltip
        facebook: "Facebook",  // Shown next to icon for sharing the current map extents via a Facebook post; works with shareViaFacebook tooltip
        twitter: "Twitter",  // Shown next to icon for sharing the current map extents via a Twitter tweet; works with shareViaTwitter tooltip
        embedding: "@es@ Embedded URL",
        go: "@es@ Go",
        browse: "@es@ Browse",
        upload: "@es@ Upload",
        add: "@es@ Add",
        locate: "@es@ Locate",
        downLoad: "@es@ Download"
    },
    tooltips: {
        search: "@es@ Search",
        reports: "@es@ Reports",
        locate: "@es@ Locate",
        share: "@es@ Share",
        help: "@es@ Help",
        clearEntry: "@es@ Clear",
        selectInitialCoordinates: "@es@ Select Initial Coordinates",
        selectFeature: "@es@ Click on a feature to select",
        completeFeatureSelection: "@es@ Press double click to finish the opertaion",
        selectCoordinates: "@es@ Please select the point",
        clearAOI: "@es@ clear AOI",
        reportFields: "@es@ Configure attributes to display"
    },
    titles: {
        webpageDisplayText: "@es@ Copy/Paste HTML into your web page",
        pointToolText: "@es@ Point",
        lineToolText: "@es@ Line",
        rectangleToolText: "@es@ Rectangle",
        polygonToolText: "@es@ Polygon",
        selectFeatureText: "@es@ Select features",
        areaStandardUnit: "@es@ acres",
        lengthStandardUnit: "@es@ Miles",
        lengthMetricUnit: "@es@ Kilometer",
        areaMetricUnit: "@es@ Sq.Km.",
        lengthMetricUnitLabel: "@es@ Km",
        standardUnitLabel: "@es@ Standard Units",
        metricUnitLabel: "@es@ Show areas in ",
        unitLabel: "@es@ Metric Units",
        uploadShapeFile: "@es@ Upload Shapefile to include in analysis",
        drawAOIBeforeUpload: "@es@ (Please draw an AOI before uploading)",
        downLoadReport: "@es@ Download Report",
        selectFormat: "@es@ Select Format:",
        selectType: "@es@ Select Type:",
        summaryReportTitle: "@es@ Summary Report Title:",
        distanceLabel: "@es@ Distance",
        bearingLabel: "@es@ Bearing",
        reportTitleValue: "@es@ Area of Interest (AOI) Information"
    },
    messages: {
        legendLoadingText: "@es@ Loading...",
        noLegend: "@es@ No Legend Available",
        sliderDisplayText: "@es@ Show results within",
        bufferSliderText: "@es@ Buffer distance (Optional for polygon AOIs)",
        orText: "@es@ OR",
        latitude: "@es@ Latitude",
        longitude: "@es@ Longitude",
        bearing: "@es@ Bearing",
        bearingValue: "@es@ (0-360)",
        distance: "@es@ Distance (Miles)",
        reportPanelHeader: "@es@ Summary Report for Area of Interest",
        selectReportFields: "@es@ Select report fields",
        reportLoadingText: "@es@ Generating report. Please wait..."
    },
    errorMessages: {
        invalidSearch: "No hay resultados",
        falseConfigParams: "Valores clave de configuración requeridos son null o no coincida exactamente con los atributos de capa, este mensaje puede aparecer varias veces.",
        invalidLocation: "@es@ Current location not found.",
        invalidProjection: "@es@ Unable to plot current location on the map.",
        widgetNotLoaded: "@es@ Unable to load widgets.",
        shareFailed: "@es@ Unable to share.",
        emptyInfoWindowTitle: "@es@ No feature details",
        emptyInfoWindowContent: "@es@ InfoWindow is disabled for the selected layer.",
        bufferSliderValue: "@es@ Buffer slider should not be set to zero distance",
        addLatitudeValue: "@es@ Please enter valid Latitude",
        addLongitudeValue: "@es@ Please enter valid Longitude.",
        addLatitudeandLongitudeValue: "@es@ Please enter valid Latitude and Longitude",
        addBearingValue: "@es@ Please specify bearing values between 0 to 360 degrees",
        addDistanceMiles: "@es@ Please add valid distance in ${0}.",
        distanceMaxLimit: "@es@ Please specify distance between 0 to ${0}.",
        errorPerfomingQuery: "@es@ Error performing query operation",
        esriJobFailMessage: "@es@ Failed to generate AOI from shapefile",
        esriJobFailToAnlayse: "@es@ Failed to execute (AnalyseShapefile)",
        esriJobFailToGenerateReport: "@es@ Failed to generate Report",
        defineAOI: "@es@ Please define AOI to generate the report.",
        invalidGeometry: "@es@ Invalid geometry.",
        noFeaturesFound: "@es@ Features not found.",
        browseFile: "@es@ Please browse to a file.",
        noFeaturesInAOI: "@es@ No features found in AOI.",
        noFieldsSelected: "@es@ No fields selected.",
        selectFeatureError: "@es@ Please double click on map to complete the select Feature.",
        inValideNumericErrorMessage: "@es@ Please enter valid inputs.",
        inValideZipFile: "@es@ Incorrect File extension\n Should be zip",
        portalUrlNotFound: "@es@ Portal URL cannot be empty",
	    queryRequestStringExceeded : "@es@ The length of the query string for this request exceeds the configured maxQueryStringLength value.",
	    defineStartPointMessage : "@es@ Please define start point",
        unableToShareURL : "@es@ Application could not be shared with current data",
        getLayerInfoError: "@es@ Unable to get layer info for layer",
        simplifyGeometryFailed: "@es@ Failed to simplify geometry",
        incorrectFields: "@es@ Incorrect fields configured",
        noFieldsConfigured: "@es@ No fields configured",
        incorrectStatisticFieldUnit: "@es@ Incorrect Statistic field unit specified for ",
        unionGeometryFailed: "@es@ Failed to union geometry"
    },
    // End of shared nls

    //App nls
    appErrorMessage: {
        layerTitleError: "@es@ Title and/or QueryLayerId parameters in SearchSettings do not match with configured operational layers.",
        titleNotMatching: " @es@ Title and/or QueryLayerId parameters in the InfoWindowSettings and SearchSettings do not match.",
        lengthDoNotMatch: "@es@ The number of objects in InfoWindowSettings and SearchSettings do not match.",
        webmapTitleError: "@es@ Title and/or QueryLayerId parameters in SearchSettings do not match with configured webmap"
    }
    //End of App nls
});
