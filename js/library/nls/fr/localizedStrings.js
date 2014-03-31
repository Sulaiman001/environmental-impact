/*global define */
/** @license
| Version 10.2
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
        showNullValue: "@@N/A",
        buttons: {
            okButtonText: "@@OK",
            print: "@@Print",
            back: "@@Back"
        },
        tooltips: {
            search: "Rechercher",
            route: "@@Route",
            locate: "Emplacement actuel",
            share: "Partager",
            help: "Aide"
        },
        titles: {
            directionsDisplayText: "@@Directions",
            informationPanelTitle: "@@Information for current map view",
            webpageDisplayText: "@@Copy/paste HTML into your web page"
        },
        errorMessages: {
            invalidSearch: "Aucun résultat",
            falseConfigParams: "Valeurs clés de configuration requis sont null ou pas exactement correspondant à des attributs de la couche. Ce message peut apparaître plusieurs fois.",
            invalidLocation: "@@Current Location not found.",
            invalidProjection: "@@Unable to plot current location on the map.",
            widgetNotLoaded: "@@Fail to load widgets.",
            shareLoadingFailed: "@@Unable to load share options.",
            shareFailed: "@@Unable to share."
        },
        notUsed: {
            addressDisplayText: "@@Address"
        }
});
