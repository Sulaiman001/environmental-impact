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
        email: "e-mail",  // Shown next to icon for sharing the current map extents via email; works with shareViaEmail tooltip
        facebook: "Facebook",  // Shown next to icon for sharing the current map extents via a Facebook post; works with shareViaFacebook tooltip
        twitter: "Twitter",  // Shown next to icon for sharing the current map extents via a Twitter tweet; works with shareViaTwitter tooltip
        embedding: "@it@ Embedded URL",
        go: "@it@ Go",
        browse: "@it@ Browse",
        upload: "@it@ Upload",
        add: "@it@ Add"
    },
    tooltips: {
        search: "Cerca",
        reports: "@it@ Reports",
        locate: "Posizione corrente",
        share: "Condividi",
        help: "Guida",
        clearEntry: "@it@ Clear"
    },
    titles: {
        areaOfInterestTabText: "@it@ Area of Interest",
        reportTabText: "Report",
        webpageDisplayText: "@it@ Copy/paste HTML into your web page",
        pointToolText: "@it@ Point",
        lineToolText: "@it@ Line",
        rectangleToolText: "@it@ Rectangle",
        polygonToolText: "@it@ Polygon",
        selectFeatureText: "@it@ Select features",
        areaStandardUnit: "@it@ acres"
    },
    messages: {
        legendLoadingText: "@it@ Loading...",
        sliderDisplayText: "@it@ Show results within ${defaultDistance}",
        aoiOptionsText: "@it@ Alternatively you can",
        uploadShapefileText: "@it@ Upload a zipped shapefile to define your AOI",
        coordinatesText: "@it@ Enter coordinates, bearing and distance",
        drawToolsText: "@it@ Use the Drawing tools to define your AOI",
        bufferSliderText: "@it@ Buffer distance (Optional for polygon AOIs)",
        radioBtnMiles: "@it@ Miles",
        radioBtnFeet: "@it@ Feet",
        radioBtnMeters: "@it@ Meters",
        radioBtnKilometers: "@it@ Kilometers",
        bearingContainerTitle: "@it@ Bearing and Distance",
        bearingContainerText: "@it@ Enter coordinates for start point, bearing and distance from start point",
        startPoint: "@it@ Define start point",
        orText: "@it@ OR",
        latitude: "@it@ Latitude",
        longitude: "@it@ Longitude",
        bearing: "@it@ Bearing",
        bearingValue: "@it@ (0-360)",
        distance: "@it@ Distance (Miles)",
        reportPanelHeader: "@it@ Summary Report for Area of Interest"
    },
    errorMessages: {
        invalidSearch: "Nessun risultato trovato.",
        falseConfigParams: "Valori chiave di configurazione obbligatori sono null o non esattamente corrispondenti con gli attributi di livello. Questo messaggio può apparire più volte.",
        invalidLocation: "@it@ Current location not found.",
        invalidProjection: "@it@ Unable to plot current location on the map.",
        widgetNotLoaded: "@it@ Unable to load widgets.",
        shareLoadingFailed: "@it@ Unable to load share options.",
        shareFailed: "@it@ Unable to share.",
        emptyInfoWindowTitle: "@it@ No feature details",
        emptyInfoWindowContent: "@it@ InfoWindow is disabled for the selected layer in webmap.",
        bufferSliderValue: "@it@ Buffer slider should not be set to zero distance"
    }
});
