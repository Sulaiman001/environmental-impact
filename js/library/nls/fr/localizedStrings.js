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
        loadingText: "@fr@ Loading...",
        settingsIconTitle: "@fr@ Choose fields to view in summary report"
    },
    titles: {
        areaOfInterestTabText: "@fr@ Area of Interest",
        reportTabText: "Report",
        webpageDisplayText: "@fr@ Copy/Paste HTML into your web page",
        pointToolText: "@fr@ Point",
        lineToolText: "@fr@ Line",
        rectangleToolText: "@fr@ Rectangle",
        polygonToolText: "@fr@ Polygon",
        selectFeatureText: "@fr@ Select features",
        areaStandardUnit: "@fr@ acres",
        areaMetricUnit: "@fr@ sq.Km",
        lineMetricdUnit: "@fr@ Km",
        lineStandardUnit: "@fr@ miles",
        standardUnitLabel: "@fr@ Standard Units",
        metricUnitLabel: "@fr@ Show areas in ",
        unitLabel: "@fr@ Metric Units",
        uploadShapeFile: "@fr@ Upload Shapefile to include in analysis",
        drawAOIBeforeUpload: "@fr@ (Please draw an AOI before uploading)",
        downLoadReport: "@fr@ Download Report",
        data: "@fr@ Data",
        selectFormat: "@fr@ Select Format",
        pdfReport: "@fr@ PDF Report",
        quickSummary: "@fr@ Quick Summary",
        deatiledSummary: "@fr@ Detailed Summary",
        drawingToolUnifiedSearchTitle: "@fr@ Navigate to geography",
        placeNameTtile: "@fr@ PlaceName Search",
        drawingTitle: "@fr@ Drawing tools",
        uploadShapefileTitle: "@fr@ Upload a zipped shapefile",
        coordinatesTitle: "@fr@ Enter coordinates, bearing and distance "
    },
    messages: {
        legendLoadingText: "@fr@ Loading...",
        sliderDisplayText: "@fr@ Show results within ${defaultDistance}",
        aoiOptionsText: "@fr@ Alternatively you can",
        uploadShapefileText: "@fr@ Upload a zipped shapefile to define your AOI",
        coordinatesText: "@fr@ Enter coordinates, bearing and distance",
        drawToolsText: "@fr@ Use the Drawing tools to define your AOI",
        bufferSliderText: "@fr@ Buffer distance (Optional for polygon AOIs)",
        placeNameSearchText: "@fr@ Use an address to define your AOI",
        radioBtnMiles: "@fr@ Miles",
        radioBtnFeet: "@fr@ Feet",
        radioBtnMeters: "@fr@ Meters",
        radioBtnKilometers: "@fr@ Kilometers",
        bearingContainerTitle: "@fr@ Bearing and Distance",
        bearingContainerText: "@fr@ Define Start point using address search",
        startPoint: "@fr@ Click on map to select start point",
        orText: "@fr@ OR",
        latitude: "@fr@ Latitude",
        longitude: "@fr@ Longitude",
        bearing: "@fr@ Bearing",
        bearingValue: "@fr@ (0-360)",
        distance: "@fr@ Distance (Miles)",
        reportPanelHeader: "@fr@ Summary Report for Area of Interest"
    },
    errorMessages: {
        invalidSearch: "Aucun résultat",
        falseConfigParams: "Valeurs clés de configuration requis sont null ou pas exactement correspondant à des attributs de la couche. Ce message peut apparaître plusieurs fois.",
        invalidLocation: "@fr@ Current location not found.",
        invalidProjection: "@fr@ Unable to plot current location on the map.",
        widgetNotLoaded: "@fr@ Unable to load widgets.",
        shareLoadingFailed: "@fr@ Unable to load share options.",
        shareFailed: "@fr@ Unable to share.",
        emptyInfoWindowTitle: "@fr@ No feature details",
        emptyInfoWindowContent: "@fr@ InfoWindow is disabled for the selected layer in webmap.",
        bufferSliderValue: "@fr@ Buffer slider should not be set to zero distance",
        addLattitudeValue: "@fr@ Please enter valid Latitude",
        addLongitudeValue: "@fr@ Please enter valid Longitude.",
        addBearingValue: "@fr@ Please add Bearing value.",
        addDistanceMiles: "@fr@ Please add Valid distance in feet.",
        errorPerfomingQuery: "@fr@ Error performing query operation",
        esriJobFailMessage: "@fr@ Failed to generate AOI from shapefile",
        esriJobFailToAnlayse: "@fr@ Failed to execute (AnalyseShapefile)"
    }
});
