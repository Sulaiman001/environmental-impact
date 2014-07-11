/*global define */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4  */
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

        // Set Proxy URL
        ProxyUrl: "/proxy/proxy.ashx",

        // Set splash window content - Message that appears when the application starts
        SplashScreen: {
            SplashScreenContent: "Lorem ipsum dolor sit er elit lamet, consectetaur cillium adipisicing pecu, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Nam liber te conscient to factor tum poen legum odioque civiuda. Lorem ipsum dolor sit er elit lamet, consectetaur cillium adipisicing pecu, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Nam liber te conscient to factor tum poen legum odioque civiuda.",
            IsVisible: true
        },

        // Set the application theme. Supported theme keys are blueTheme and greenTheme.
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
        // Specify URL to ArcGIS Portal REST API
        PortalAPIURL: "http://www.arcgis.com/sharing/rest/",

        // Specify URL to Search
        SearchURL: "http://www.arcgis.com/sharing/rest/search?q=group:",

        // Specify the title of group that contains basemaps
        BasemapGroupTitle: "Basemaps",

        // Specify the user name of owner of the group that contains basemaps
        BasemapGroupOwner: "GISITAdmin",

        // Specify path to image used to display the thumbnail for a basemap when portal does not provide it
        NoThumbnail: "js/library/themes/images/notAvailable.png",

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
        // SEARCH SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Configure search, barrier and info settings to be displayed in search Info panels:

        // Configure search settings below.
        // Title: In case of webmap implementations, it must match layer name specified in webmap and in case of operational layers
        //        it should be the name of Map/Feature Service.
        // QueryLayerId: This is the layer index in the webmap or ArcGIS Map/Feature Service and is used for performing queries.
        // SearchDisplayTitle: This text is displayed in search results as the title to group results.
        // SearchDisplayFields: Attribute that will be displayed in the search box when user performs a search.
        // SearchExpression: Configure the query expression to be used for search.
        // QuickSummaryReportFields: Specify fields to summarize on in the quick summary report.
        // SummaryStatisticField: Specify field name containing area for polygon layer, length for polyline layer and empty string for point layer. Ignored for point layers.
        // DetailSummaryReportFields:  Specify fields to summarize on in the detailed summary report.

        SearchSettings: [{
            Title: "EIAPoly",
            QueryLayerId: "0",
            SearchDisplayTitle: "Placenames in Florida",
            SearchDisplayFields: "${FEATURE_NA}",
            SearchExpression: "UPPER(FEATURE_NA) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: ["COUNTY_NAM"],
            SummaryStatisticField: "",
            DetailSummaryReportFields: ["COUNTY_NUM"],
            UnifiedSearch: "true"
        }, {
            Title: "EIAPoly",
            QueryLayerId: "10",
            SearchDisplayTitle: "Florida Managed Areas",
            SearchDisplayFields: "${MANAME}",
            SearchExpression: "UPPER(MANAME) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: ["MANAME", "MAJORMA"],
            SummaryStatisticField: "Shape_Area",
            DetailSummaryReportFields: ["COUNTY", "MGRCITY"],
            UnifiedSearch: "true"
        }],

        // Following zoom level will be set for the map upon searching an address
        ZoomLevel: 12,

        // Minimum height should be 250 for the info-popup in pixels
        InfoPopupHeight: 250,

        // Minimum width should be 300 for the info-popup in pixels
        InfoPopupWidth: 300,

        // Configure graphic color to be set for uploaded shapefile
        RendererColor: "#1C86EE",

        // Configure graphic color to be set for buffer around AOI
        BufferSymbology: {
            FillSymbolColor: "255,0,0",
            FillSymbolTransparency: "0.10",
            LineSymbolColor: "255,0,0",
            LineSymbolTransparency: "0.30"
        },

        // Configure graphic color to be set for searched features
        HighlightFeaturesSymbology: {
            FillSymbolColor: "125,125,125",
            FillSymbolTransparency: "0.30",
            LineSymbolColor: "255,0,0",
            LineSymbolTransparency: "1",
            MarkerSymbolColor: "255,0,0",
            MarkerSymbolTransparency: "1"
        },

        // Set symbology for creating point and line while defining AOI using bearing and distance
        AOISymbology: {
            PointFillSymbolColor: "255,255,255",
            PointSymbolBorder: "0,0,255",
            PointSymbolBorderWidth: "2",
            LineSymbolColor: "0,0,255",
            LineSymbolWidth: "3"
        },

        // Set the various units to be used for buffer distance
        DistanceUnitSettings: [{
            DistanceUnitName: "Miles",
            MinimumValue: 0,
            MaximumValue: 100,
            Selected: true
        }, {
            DistanceUnitName: "Feet",
            MinimumValue: 0,
            MaximumValue: 1000,
            Selected: false
        }, {
            DistanceUnitName: "Meters",
            MinimumValue: 0,
            MaximumValue: 1000,
            Selected: false
        }, {
            DistanceUnitName: "Kilometers",
            MinimumValue: 0,
            MaximumValue: 100,
            Selected: false
        }],

        // Configure this flag to show or hide map attribution data
        ShowMapAttribution: true,

        // Configure this flag to show or hide legend panel
        ShowLegend: true,

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
        }, {
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
        // DefaultLocatorSymbol: Set the image path for locator symbol. e.g. pushpin.
        // MarkupSymbolSize: Set the image dimensions in pixels for locator symbol.
        // DisplayText: Set the title for type of search e.g. 'Address'.
        // LocatorDefaultAddress: Set the default address to search.
        // LocatorDefaultPlaceNameSearchAddress: Set the default address to search for place name.
        // LocatorDefaultAOIAddress: Set the default address to search for draw tools.
        // LocatorDefaultAOIBearingAddress: Set the default address to search for bearing and distance.
        // LocatorParameters: Required parameters to search the address candidates.
        //   SearchField: The name of geocode service input field that accepts the search address. e.g. 'SingleLine' or 'Address'.
        //   SearchBoundaryField: The name of geocode service input field that accepts an extent to search an input address within. e.g."searchExtent".
        // LocatorURL: Specify URL for geocode service.
        // LocatorOutFields: The list of outfields to be included in the result set provided by geocode service.
        // DisplayField: Specify the outfield of geocode service. The value in this field will be displayed for search results in the application.
        // AddressMatchScore: Required parameters to specify the accuracy of address match.
        //   Field: Set the outfield of geocode service that contains the Address Match Score.
        //   Value: Set the minimum score value for filtering the candidate results. The value should a number between 0-100.
        // FilterFieldName: Set the feature type for results returned by the geocode request. e.g. For World GeoCode, the field that contains the feature type is 'Type'.
        // FilterFieldValues: Specify the feature types to filter search results. e.g. 'county', 'city' etc.
        // MaxResults: Maximum number of locations to display in the results menu.

        LocatorSettings: {
            DefaultLocatorSymbol: "/js/library/themes/images/redpushpin.png",
            MarkupSymbolSize: {
                width: 35,
                height: 35
            },
            DisplayText: "Address",
            LocatorDefaultAddress: "Grandview Ln N, Bismarck, ND, 58503",
            LocatorDefaultPlaceNameSearchAddress: "Mulberry, Florida",
            LocatorDefaultAOIAddress: "Mulberry, Florida",
            LocatorDefaultAOIBearingAddress: "Mulberry, Florida",
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

        // Supported units for Bearing Distances are feet, meters, miles and kilometers.
        BearingDistanceUnit: "Feet",

        // Max limit for setting the bearing distance
        BearingDistanceMaxLimit: 10000,

        // Supported formats for downloading the report
        DownloadReportFormat: {
            Format: "FileGDB, Shapefile, CSV"
        },
        // ------------------------------------------------------------------------------------------------------------------------
        // GEOMETRY SERVICE SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------

        // Set geometry service URL
        GeometryService: "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",

        // Set GP service for uploading shapefile
        UploadFileUrl: "http://203.199.47.114/arcgis/rest/services/EnvironmentalImpact/EnvironmentalImpact/GPServer/uploads/upload",

        // Set GP service for generating report after uploading shapefile
        ShapefileTOAOI: "http://203.199.47.114/arcgis/rest/services/EnvironmentalImpact/EnvironmentalImpact/GPServer/ShapefileToAOI",

        // Set GP service for uploading shapefile for analysis
        AnalyseShapefile: "http://203.199.47.114/arcgis/rest/services/EnvironmentalImpact/EnvironmentalImpact/GPServer/AnalyseShapefile",

        // Set GP service for generating report
        GenerateReport: "http://203.199.47.114/arcgis/rest/services/EnvironmentalImpact/Generate_Report/GPServer/GenerateReport",

        // SETTINGS FOR MAP SHARING
        // ------------------------------------------------------------------------------------------------------------------------

        // Set URL for TinyURL service, and URLs for social media
        MapSharingOptions: {
            TinyURLServiceURL: "http://api.bit.ly/v3/shorten?login=esri&apiKey=R_65fd9891cd882e2a96b99d4bda1be00e&uri=${0}&format=json",
            TinyURLResponseAttribute: "data.url",
            FacebookShareURL: "http://www.facebook.com/sharer.php?u=${0}&t=Environmental%20Impact",
            TwitterShareURL: "http://mobile.twitter.com/compose/tweet?status=Environmental%20Impact ${0}",
            ShareByMailLink: "mailto:%20?subject=Check%20out%20this%20map!&body=${0}"
        },

        // Set Area Of Interest Tab Text
        AOITabText: "Area of Interest",

        // Set Report Tab Text
        ReportTabText: "Report"
    };
});
