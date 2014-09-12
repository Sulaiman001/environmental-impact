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
        loadingText: "@es@ Loading...",
        settingsIconTitle: "@es@ Choose fields to view in summary report",
        selectFeature: "@es@ Press double click to finish the opertaion",
        selectCoordinates: "@es@ Please select the point",
        clearAOI: "@es@ clear AOI"
    },
    titles: {
        areaOfInterestTabText: "@es@ Area of Interest",
        reportTabText: "@es@ Report",
        webpageDisplayText: "@es@ Copy/Paste HTML into your web page",
        pointToolText: "@es@ Point",
        multipointToolText: "@es@ Multipoint",
        lineToolText: "@es@ Line",
        rectangleToolText: "@es@ Rectangle",
        polygonToolText: "@es@ Polygon",
        selectFeatureText: "@es@ Select features",
        areaStandardUnit: "@es@ acres",
        areaMetricUnit: "@es@ sq.Km",
        lineMetricdUnit: "@es@ Km",
        lineStandardUnit: "@es@ miles",
        lineMetricUnit: "@es@ Kilometer",
        standardUnitLabel: "@es@ Standard Units",
        standardReportUnit: "@es@ Standard",
        metricUnitLabel: "@es@ Show areas in ",
        unitLabel: "@es@ Metric Units",
        uploadShapeFile: "@es@ Upload Shapefile to include in analysis",
        drawAOIBeforeUpload: "@es@ (Please draw an AOI before uploading)",
        downLoadReport: "@es@ Download Report",
        data: "@es@ Data",
        selectFormat: "@es@ Select Format",
        selectType: "@es@ Select Type",
        pdfReport: "@es@ PDF",
        fileGDBReport: "@es@ File GDB",
        excelReport: "@es@ Excel",
        quickSummary: "@es@ Quick Summary",
        deatiledSummary: "@es@ Detailed Summary",
        drawingToolUnifiedSearchTitle: "@es@ Navigate to geography",
        placeNameTtile: "@es@ Placename",
        drawingTitle: "@es@ Draw",
        uploadShapefileTitle: "@es@ Shapefile",
        coordinatesTitle: "@es@ Coordinates",
        distanceLabel: "@es@ Distance",
        bearingLabel: "@es@ Bearing",
        quickReport: "@es@ Quick Report",
        detailedReport: "@es@ Detailed Report"
    },
    messages: {
        legendLoadingText: "@es@ Loading...",
        noLegend: "@es@ No Legend Available",
        sliderDisplayText: "@es@ Show results within",
        aoiOptionsText: "@es@ Define AOI by using",
        uploadShapefileText: "@es@ Upload a zipped shapefile to define your AOI",
        coordinatesText: "@es@ Enter coordinates, bearing and distance",
        drawToolsText: "@es@ Use the Drawing tools to define your AOI",
        bufferSliderText: "@es@ Buffer distance (Optional for polygon AOIs)",
        placeNameSearchText: "@es@ Use an address to define your AOI",
        radioBtnMiles: "@es@ Miles",
        radioBtnFeet: "@es@ Feet",
        radioBtnMeters: "@es@ Meters",
        radioBtnKilometers: "@es@ Kilometers",
        bearingContainerTitle: "@es@ Bearing and Distance",
        bearingContainerText: "@es@ Define Start point using address search",
        startPoint: "@es@ Click on map to select start point",
        orText: "@es@ OR",
        latitude: "@es@ Latitude",
        longitude: "@es@ Longitude",
        bearing: "@es@ Bearing",
        bearingValue: "@es@ (0-360)",
        distance: "@es@ Distance (Miles)",
        reportPanelHeader: "@es@ Summary Report for Area of Interest",
        selectReportFields: "@es@ Select report fields"
    },
    errorMessages: {
        invalidSearch: "No hay resultados",
        falseConfigParams: "Valores clave de configuración requeridos son null o no coincida exactamente con los atributos de capa, este mensaje puede aparecer varias veces.",
        invalidLocation: "@es@ Current location not found.",
        invalidProjection: "@es@ Unable to plot current location on the map.",
        widgetNotLoaded: "@es@ Unable to load widgets.",
        shareFailed: "@es@ Unable to share.",
        emptyInfoWindowTitle: "@es@ No feature details",
        emptyInfoWindowContent: "@es@ InfoWindow is disabled for the selected layer in webmap.",
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
        browseFile: "@es@ Please browse a file.",
        noFeaturesInAOI: "@es@ No features found in AOI.",
        noFieldsSelected: "@es@ No fields selected.",
        reportFormat: "@es@ Please Select the Report Format",
        selectFeatureError: "@es@ Please double click on map to complete the select Feature.",
        inValideNumericErrorMessage: "@es@ Please enter valid inputs.",
        inValideZipFile: "@es@ Incorrect File extension\n Should be zip",
        portalUrlNotFound: "@es@ Portal URL cannot be empty",
        searchTextErrorMessage: "@es@ Please enter input to search"
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
