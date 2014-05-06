/*global define */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4*/
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
    messages: {
        splashScreenContent: "Un'applicazione che permette al pubblico di trovare informazioni sulle condizioni stradali, 511 avvisi, incidenti stradali, et al."
    },
    errorMessages: {
        layerTitleError: "Title and/or QueryLayerId parameters in SearchSettings do not match with configured operational layers.",
        titleNotMatching: "Title and/or QueryLayerId parameters in the InfoWindowSettings and SearchSettings do not match.",
        lengthDoNotMatch: "The number of objects in InfoWindowSettings and SearchSettings do not match.",
        webmapTitleError: "Title and/or QueryLayerId parameters in SearchSettings do not match with configured webmap"
    }
});
