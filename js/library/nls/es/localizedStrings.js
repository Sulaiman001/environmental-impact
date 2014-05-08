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
        add: "@es@ Add"
    },
    tooltips: {
        search: "Buscar",
        reports: "@es@ Reports",
        locate: "Ubicación actual",
        share: "Compartir",
        help: "Ayuda",
        clearEntry: "@es@ Clear"
    },
    titles: {
        areaOfInterestTabText: "@es@ Area of Interest",
        reportTabText: "Report",
        webpageDisplayText: "@es@ Copy/paste HTML into your web page",
        pointToolText: "@es@ Point",
        lineToolText: "@es@ Line",
        rectangleToolText: "@es@ Rectangle",
        polygonToolText: "@es@ Polygon",
        selectFeatureText: "@es@ Select features",
        areaStandardUnit: "@es@ acres"
    },
    messages: {
        legendLoadingText: "@es@ Loading...",
        sliderDisplayText: "@es@ Show results within ${defaultDistance}",
        aoiOptionsText: "@es@ Alternatively you can",
        uploadShapefileText: "@es@ Upload a zipped shapefile to define your AOI",
        coordinatesText: "@es@ Enter coordinates, bearing and distance",
        drawToolsText: "@es@ Use the Drawing tools to define your AOI",
        bufferSliderText: "@es@ Buffer distance (Optional for polygon AOIs)",
        radioBtnMiles: "@es@ Miles",
        radioBtnFeet: "@es@ Feet",
        radioBtnMeters: "@es@ Meters",
        radioBtnKilometers: "@es@ Kilometers",
        bearingContainerTitle: "@es@ Bearing and Distance",
        bearingContainerText: "@es@ Enter coordinates for start point, bearing and distance from start point",
        startPoint: "@es@ Define start point",
        orText: "@es@ OR",
        latitude: "@es@ Latitude",
        longitude: "@es@ Longitude",
        bearing: "@es@ Bearing",
        bearingValue: "@es@ (0-360)",
        distance: "@es@ Distance (Miles)",
        reportPanelHeader: "@es@ Summary Report for Area of Interest"
    },
    errorMessages: {
        invalidSearch: "No hay resultados",
        falseConfigParams: "Valores clave de configuración requeridos son null o no coincida exactamente con los atributos de capa, este mensaje puede aparecer varias veces.",
        invalidLocation: "@es@ Current location not found.",
        invalidProjection: "@es@ Unable to plot current location on the map.",
        widgetNotLoaded: "@es@ Unable to load widgets.",
        shareLoadingFailed: "@es@ Unable to load share options.",
        shareFailed: "@es@ Unable to share.",
        emptyInfoWindowTitle: "@es@ No feature details",
        emptyInfoWindowContent: "@es@ InfoWindow is disabled for the selected layer in webmap.",
        bufferSliderValue: "Buffer slider should not be set to zero distance"
    }
});
