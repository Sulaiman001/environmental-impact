/*global require,dojo,dojoConfig,esri,esriConfig,alert,appGlobals */
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
//============================================================================================================================//

require([
    "coreLibrary/widgetLoader",
    "application/js/config",
    "esri/config",
	"esri/urlUtils",
    "dojo/domReady!"
], function (WidgetLoader, config, esriConfig, urlUtils) {
    //========================================================================================================================//

    try {
        appGlobals = {};
        appGlobals.configData = config;
        if (appGlobals.configData.ProxyUrl && (!appGlobals.configData.ProxyUrl.match("http://") && (!appGlobals.configData.ProxyUrl.match("https://")))) {
            appGlobals.configData.ProxyUrl = dojoConfig.baseURL + appGlobals.configData.ProxyUrl;
        }
        
		esriConfig.defaults.io.proxyUrl = appGlobals.configData.ProxyUrl;
		
		/**
		* Uncomment out the following lines and update with your secured ArcGIS Services Directory. 
		* The URL should match what was configured in the proxy.config.
		* For each unique secured URL configured in the proxy, 
		*       copy the addProxyRule section and configure with the appropriate URL.
		*/
		
		// urlUtils.addProxyRule({
        //        urlPrefix: "http://54.203.249.87/arcgis/rest/services/",
        //        proxyUrl: appGlobals.configData.ProxyUrl
        //    });
        
		/** 
		* Use the following section if your configured webmap is also secured (not public)
		*/
		// urlUtils.addProxyRule({
        //         urlPrefix: "http://www.arcgis.com/sharing/rest/",
        //         proxyUrl: appGlobals.configData.ProxyUrl
        //     });  
		
		/**
        * load application configuration settings from configuration file
        * create an object of widget loader class
        */
        var applicationWidgetLoader = new WidgetLoader();
        applicationWidgetLoader.startup();

    } catch (ex) {
        alert(ex.message);
    }
});
