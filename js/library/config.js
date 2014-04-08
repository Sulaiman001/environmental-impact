/*global define */
/*jslint sloppy:true */
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
define([], function () {
    return {

        // This file contains various configuration settings for esri template
        //
        // Use this file to perform the following:
        //
        // 1.  Specify application Name                      - [ Tag(s) to look for: ApplicationName ]
        // 2.  Set path for application icon                 - [ Tag(s) to look for: ApplicationIcon ]
        // 3.  Set path for application favicon              - [ Tag(s) to look for: ApplicationFavicon ]
        // 4.  Set URL for help page                         - [ Tag(s) to look for: HelpURL ]
        // 5.  Specify header widget settings                - [ Tag(s) to look for: AppHeaderWidgets ]
        // 6.  Specify URLs for base maps                    - [ Tag(s) to look for: BaseMapLayers ]
        // 7.  Set initial map extent                        - [ Tag(s) to look for: DefaultExtent ]
        // 8.  Specify URLs for operational layers           - [ Tag(s) to look for: OperationalLayers]
        // 9.  Customize zoom level for address search       - [ Tag(s) to look for: ZoomLevel ]
        // 10. Customize address search settings             - [ Tag(s) to look for: LocatorSettings]
        // 11. Set URL for geometry service                  - [ Tag(s) to look for: GeometryService ]
        // 12. Specify URLs for map sharing                  - [ Tag(s) to look for: MapSharingOptions,TinyURLServiceURL, TinyURLResponseAttribute, FacebookShareURL, TwitterShareURL, ShareByMailLink ]

        // ------------------------------------------------------------------------------------------------------------------------
        // GENERAL SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set application title
        ApplicationName: "Environmental Impact",

        // Set application icon path
        ApplicationIcon: "/js/library/themes/images/logoGreen.png",

        // Set application Favicon path
        ApplicationFavicon: "/js/library/themes/images/faviconGreen.ico",

        // Set URL of help page/portal
        HelpURL: "help.htm",

        // Set application logo url
        CustomLogoUrl: "",

        // Set splash window content - Message that appears when the application starts
        SplashScreen: {
            // splash screen Message is set in locale file in nls directory
            IsVisible: true
        },

        ThemeColor: "js/library/themes/styles/greenTheme.css",

        //------------------------------------------------------------------------------------------------------------------------
        // Header Widget Settings
        //------------------------------------------------------------------------------------------------------------------------
        // Set widgets settings such as widget title, widgetPath, mapInstanceRequired to be displayed in header panel
        // Title: Name of the widget, will displayed as title of widget in header panel
        // WidgetPath: path of the widget respective to the widgets package.
        // MapInstanceRequired: true if widget is dependent on the map instance.

        AppHeaderWidgets: [{
            WidgetPath: "widgets/locator/locator",
            MapInstanceRequired: true
        }, {
            WidgetPath: "widgets/reports/reports",
            MapInstanceRequired: true
        }, {
            WidgetPath: "widgets/geoLocation/geoLocation",
            MapInstanceRequired: true
        }, {
            WidgetPath: "widgets/share/share",
            MapInstanceRequired: true
        }, {
            WidgetPath: "widgets/help/help",
            MapInstanceRequired: false
        }],

        // ------------------------------------------------------------------------------------------------------------------------
        // BASEMAP SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set baseMap layers
        // Please note: All base-maps need to use the same spatial reference. By default, on application start the first base-map will be loaded

        BaseMapLayers: [{
            Key: "topo",
            ThumbnailSource: "js/library/themes/images/Topographic.jpg",
            Name: "Topographic Map",
            MapURL: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer"
        }, {
            Key: "streets",
            ThumbnailSource: "js/library/themes/images/streets.png",
            Name: "Street Map",
            MapURL: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer"
        }, {
            Key: "imagery",
            ThumbnailSource: "js/library/themes/images/imagery.png",
            Name: "Imagery Map",
            MapURL: "http://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
        }],


        // Initial map extent. Use comma (,) to separate values and dont delete the last comma
        // The coordinates must be specified in the basemap's coordinate system, usually WKID:102100, unless a custom basemap is used
        DefaultExtent: "-9136659, 3233348, -9123608, 3239559",

        // Choose if you want to use WebMap or Map Services for operational layers. If using WebMap, specify WebMapId within quotes, otherwise leave this empty and configure operational layers
        WebMapId: "",

        // OPERATIONAL DATA SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------

        // Configure operational layers:

        // Configure operational layers  below. The order of displaying layers is reversed on map. The last configured layer is displayed on top.
        // ServiceURL: URL of the layer.
        // LoadAsServiceType: Field to specify if the operational layers should be added as dynamic map service layer or feature layer.
        //                    Supported service types are 'dynamic' or 'feature'.
        OperationalLayers: [{
            ServiceURL: "http://54.193.222.183:6080/arcgis/rest/services/EIAPoly/MapServer/0",
            LoadAsServiceType: "dynamic"
        }, {
            ServiceURL: "http://54.193.222.183:6080/arcgis/rest/services/EIAPoly/MapServer/10",
            LoadAsServiceType: "dynamic"
        }],

        // ------------------------------------------------------------------------------------------------------------------------
        // SEARCH AND 511 SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Configure search, barrier and info settings to be displayed in search and 511 Info panels:

        // Configure search and 511 settings below.
        // Title: In case of webmap implementations, it must match layer name specified in webmap and in case of operational layers
        //        it should be the name of Map/Feature Service.
        // QueryLayerId: This is the layer index in the webmap or ArcGIS Map/Feature Service and is used for performing queries.
        // SearchDisplayTitle: This text is displayed in search results as the title to group results.
        // SearchDisplayFields: Attribute that will be displayed in the search box when user performs a search.
        // SearchExpression: Configure the query expression to be used for search.

        SearchSettings: [{
            Title: "EIAPoly",
            QueryLayerId: "0",
            SearchDisplayTitle: "Placenames in Florida",
            SearchDisplayFields: "${FEATURE_NA}",
            SearchExpression: "UPPER(FEATURE_NA) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: "COUNTY_NAM"
        },  {
            Title: "EIAPoly",
            QueryLayerId: "10",
            SearchDisplayTitle: "Florida Managed Areas",
            SearchDisplayFields: "${MANAME}",
            SearchExpression: "UPPER(MANAME) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: "MATYPE"
        }],

        // Following zoom level will be set for the map upon searching an address
        ZoomLevel: 12,

        //minimum height should be 310 for the info-popup in pixels
        InfoPopupHeight: 250,

        // Minimum width should be 330 for the info-popup in pixels
        InfoPopupWidth: 300,

        BufferSliderSettings: {
            defaultValue: 0,
            minValue: 0,
            maxValue: 100,
            intermediateChanges: true,
            showButtons: false
        },

        BufferSymbology: {
            FillSymbolColor: "255,0,0",
            FillSymbolTransparency: "0.10",
            LineSymbolColor: "255,0,0",
            LineSymbolTransparency: "0.30"
        },

        HighlightFeaturesSymbology: {
            FillSymbolColor: "125,125,125",
            FillSymbolTransparency: "0.30",
            LineSymbolColor: "255,0,0",
            LineSymbolTransparency: "1",
            MarkerSymbolColor:"255,0,0",
            MarkerSymbolTransparency: "1"
        },

        DistanceUnitSettings: [{
            DistanceUnitName: "Miles",
            MinimumValue: 0,
            MaximumValue: 100,
            Checked:true
        },{
            DistanceUnitName: "Feet",
            MinimumValue: 0,
            MaximumValue: 1000,
            Checked:false
        },{
            DistanceUnitName: "Meters",
            MinimumValue: 0,
            MaximumValue: 1000,
            Checked:false
        }, {
            DistanceUnitName: "Kilometers",
            MinimumValue: 0,
            MaximumValue: 100,
            Checked:false
        }],

        ShowMapAttribution: true,

        // ------------------------------------------------------------------------------------------------------------------------
        // INFO-WINDOW SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Configure info-popup settings. The Title and QueryLayerId fields should be the same as configured in "Title" and "QueryLayerId" fields in SearchSettings.
        // Title: In case of webmap implementations, it must match layer name specified in webmap and in case of operational layers
        //        it should be the name of Map/Feature Service.
        // QueryLayerId: Layer index used for performing queries.
        // InfoWindowHeaderField: Specify field for the info window header
        // InfoWindowData: Set the content to be displayed in the info-Popup. Define labels and field values.
        //                    These fields should be present in the layer referenced by 'QueryLayerId' specified under section 'SearchSettings'
        // DisplayText: Caption to be displayed instead of field alias names. Set this to empty string ("") if you wish to display field alias names as captions.
        // FieldName: Field used for displaying the value
        InfoWindowSettings: [{
            Title: "EIAPoly",
            QueryLayerId: "0",
            InfoWindowHeaderField: "${FEATURE_ID}",
            InfoWindowData: [{
                DisplayText: "Feature Name:",
                FieldName: "${FEATURE_NA}"
            }, {
                DisplayText: "Feature Class:",
                FieldName: "${FEATURE_CL}"
            }, {
                DisplayText: "County_Name:",
                FieldName: "${COUNTY_NAM}"
            }, {
                DisplayText: "County Number:",
                FieldName: "${COUNTY_NUM}"
            }, {
                DisplayText: "Date Created:",
                FieldName: "${DATE_CREAT}"
            }]
        },  {
            Title: "EIAPoly",
            QueryLayerId: "10",
            InfoWindowHeaderField: "${MANAME}",
            InfoWindowData: [{
                DisplayText: "Name:",
                FieldName: "${MANAME}"
            }, {
                DisplayText: "Type:",
                FieldName: "${MATYPE}"
            }, {
                DisplayText: "Major Name:",
                FieldName: "${MAJORMA}"
            }, {
                DisplayText: "Managing Agency:",
                FieldName: "${MANAGING_A}"
            }, {
                DisplayText: "Owner:",
                FieldName: "${OWNER}"
            }, {
                DisplayText: "Co-owners:",
                FieldName: "${COOWNERS}"
            }, {
                DisplayText: "Comments 1:",
                FieldName: "${COMMENTS1}"
            }, {
                DisplayText: "Comments 2:",
                FieldName: "${COMMENTS2}"
            }, {
                DisplayText: "Manager City:",
                FieldName: "${MGRCITY}"
            }]
        }],

        // ------------------------------------------------------------------------------------------------------------------------
        // ADDRESS SEARCH SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set locator settings such as locator symbol, size, display fields, match score
        // LocatorParameters: Parameters(text, outFields, maxLocations, bbox, outSR) used for address and location search.
        // AddressSearch: Candidates based on which the address search will be performed.
        // AddressMatchScore: Setting the minimum score for filtering the candidate results.
        // MaxResults: Maximum number of locations to display in the results menu.
        LocatorSettings: {
            DefaultLocatorSymbol: "/js/library/themes/images/redpushpin.png",
            MarkupSymbolSize: {
                width: 35,
                height: 35
            },
            DisplayText: "Address",
            LocatorDefaultAddress: "Grandview Ln N, Bismarck, ND, 58503",
            LocatorDefaultAOIAddress: "Mulberry, Florida",
            LocatorParameters: {
                SearchField: "SingleLine",
                SearchBoundaryField: "searchExtent"
            },
            LocatorURL: "http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
            LocatorOutFields: ["Addr_Type", "Type", "Score", "Match_Addr", "xmin", "xmax", "ymin", "ymax"],
            DisplayField: "${Match_Addr}",
            AddressMatchScore: {
                Field: "Score",
                Value: 80
            },
            FilterFieldName: 'Addr_Type',
            FilterFieldValues: ["StreetAddress", "StreetName", "PointAddress", "POI"],
            MaxResults: 200
        },

        // ------------------------------------------------------------------------------------------------------------------------
        // GEOMETRY SERVICE SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------

        // Set geometry service URL
        GeometryService: "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",
        // ------------------------------------------------------------------------------------------------------------------------

        // ------------------------------------------------------------------------------------------------------------------------
        // SETTINGS FOR MAP SHARING
        // ------------------------------------------------------------------------------------------------------------------------

        // Set URL for TinyURL service, and URLs for social media
        MapSharingOptions: {
            TinyURLServiceURL: "http://api.bit.ly/v3/shorten?login=esri&apiKey=R_65fd9891cd882e2a96b99d4bda1be00e&uri=${0}&format=json",
            TinyURLResponseAttribute: "data.url",
            FacebookShareURL: "http://www.facebook.com/sharer.php?u=${0}&t=Environmental%20Impact",
            TwitterShareURL: "http://mobile.twitter.com/compose/tweet?status=Environmental%20Impact ${0}",
            ShareByMailLink: "mailto:%20?subject=Check%20out%20this%20map!&body=${0}"
        }
    };
});