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
        // 1.  Specify application Name                      - [ Tag(s) to look for: ApplicationName ]
        // 2.  Set path for application icon                 - [ Tag(s) to look for: ApplicationIcon ]
        // 3.  Set path for application favicon              - [ Tag(s) to look for: ApplicationFavicon ]
        // 4.  Set URL for help page                         - [ Tag(s) to look for: HelpURL ]
        // 5.  Specify header widget settings                - [ Tag(s) to look for: AppHeaderWidgets ]
        // 6.  Set initial map extent                        - [ Tag(s) to look for: DefaultExtent ]
        // 7.  Specify URLs for operational layers           - [ Tag(s) to look for: OperationalLayers]
        // 8.  Customize zoom level for address search       - [ Tag(s) to look for: ZoomLevel ]
        // 9. Customize address search settings             - [ Tag(s) to look for: LocatorSettings]
        // 10. Set URL for geometry service                  - [ Tag(s) to look for: GeometryService ]
        // 11. Specify URLs for map sharing                  - [ Tag(s) to look for: MapSharingOptions,TinyURLServiceURL, TinyURLResponseAttribute, FacebookShareURL, TwitterShareURL, ShareByMailLink ]

        // ------------------------------------------------------------------------------------------------------------------------
        // GENERAL SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set application title
        ApplicationName: "Environmental Impact (Water)",

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
            SplashScreenContent: "The Environmental Impact application helps environmental agencies and organizations evaluate and report on the potential impact of development, research, or other activities on the natural environment, sensitive species, and other important factors. Access to this information facilitates better decisions and helps to ensure that investments in the area are sustainable and minimize disruption to the natural environment.<br><br>Search for a location, define a project area by drawing on the map, uploading a shapefile, or entering a traverse, and generate reports that can be shared with others.",
            IsVisible: true
        },

        // Set the application theme. Supported theme keys are blueTheme and greenTheme.
        ThemeColor: "js/library/themes/styles/greenTheme.css",

        // ------------------------------------------------------------------------------------------------------------------------
        // BASEMAP SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Set options for basemap
        // Please note: All base-maps need to use the same spatial reference.

        // Specify URL to ArcGIS Portal REST API
        PortalAPIURL: "http://www.arcgis.com/sharing/rest/",
        // Specify the title of group that contains basemaps
        BasemapGroupTitle: "Basemaps",
        // Specify the user name of owner of the group that contains basemaps
        BasemapGroupOwner: "GISITAdmin",
        // Specify spatial reference for basemaps, since all basemaps need to use the same spatial reference
        BasemapSpatialReferenceWKID: 102100,
        // Specify path to image used to display the thumbnail for a basemap when portal does not provide it
        NoThumbnail: "js/library/themes/images/notAvailable.png",

        // Initial map extent. Use comma (,) to separate values and dont delete the last comma
        // The coordinates must be specified in the basemap's coordinate system, usually WKID:102100, unless a custom basemap is used
        DefaultExtent: "-9136659, 3233348, -9123608, 3239559",

        // Choose if you want to use WebMap or Map Services for operational layers. If using WebMap, specify WebMapId within quotes, otherwise leave this empty and configure operational layers
        WebMapId: "",

        // Set Area Of Interest Tab Text
        AOITabText: "1. Area of Interest",

        // Set Report Tab Text
        ReportTabText: "2. Report",

        // ------------------------------------------------------------------------------------------------------------------------
        // AOI TAB SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Placename tab AOI definition labels
        // Title: Set Placename tab title
        // DefineAOILabel: Specify text to display as a hint to define AOI
        PlacenameTab: {
            Title: "Placename",
            DefineAOILabel: "Use an address to define your AOI"
        },

        // Draw tab AOI definition labels
        // Title: Draw tab title
        // AddressSearchHintLabel: Specify text to display as a hint above address search
        // DefineAOILabel: Specify text to display as a hint to define AOI
        DrawTab: {
            Title: "Draw",
            AddressSearchHintLabel: "Navigate to geography",
            DefineAOILabel: "Use the Drawing tools to define your AOI",
            SelectFeaturesLabel: "Select features from the map"
        },

        // Shapefile tab AOI definition labels
        // Title: Shapefile tab title
        // DefineAOILabel : Specify text to display as a hint to define AOI
        ShapefileTab: {
            Title: "Shapefile",
            DefineAOILabel: "Upload a zipped shapefile to define your AOI"
        },

        // Coordinates tab AOI definition labels
        // Title: Coordinates tab title
        // DefineStartPointAddressLabel: Specify text to display as a hint to define start point using an address
        // DefineStartPointMapClickLabel: Specify text to display as a hint to define start point by clicking on map
        // EnterBearingDistanceLabel: Specify text to display as a hint to add bearing and distance
        CoordinatesTab: {
            Title: "Coordinates",
            DefineStartPointAddressLabel: "Define Start point using address search",
            DefineStartPointMapClickLabel: "Click on map to select start point",
            EnterBearingDistanceLabel: "Enter bearings and distances from start point"
        },

        // ------------------------------------------------------------------------------------------------------------------------
        // OPERATIONAL DATA SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------
        // Configure operational layers:

        // Configure operational layers  below. The order of displaying layers is reversed on map. The last configured layer is displayed on top.
        // ServiceURL: URL of the layer.
        // LoadAsServiceType: Field to specify if the operational layers should be added as dynamic map service layer or feature layer.
        //                    Supported service types are 'dynamic' or 'feature'.
        OperationalLayers: [{
            ServiceURL: "http://tryitlive.arcgis.com/arcgis/rest/services/EnvironmentalImpactWater/MapServer/8",
            LoadAsServiceType: "dynamic"
        }, {
            ServiceURL: "http://tryitlive.arcgis.com/arcgis/rest/services/EnvironmentalImpactWater/MapServer/7",
            LoadAsServiceType: "dynamic"
        }, {
            ServiceURL: "http://tryitlive.arcgis.com/arcgis/rest/services/EnvironmentalImpactWater/MapServer/6",
            LoadAsServiceType: "dynamic"
        }, {
            ServiceURL: "http://tryitlive.arcgis.com/arcgis/rest/services/EnvironmentalImpactWater/MapServer/5",
            LoadAsServiceType: "dynamic"
        }, {
            ServiceURL: "http://tryitlive.arcgis.com/arcgis/rest/services/EnvironmentalImpactWater/MapServer/4",
            LoadAsServiceType: "dynamic"
        }, {
            ServiceURL: "http://tryitlive.arcgis.com/arcgis/rest/services/EnvironmentalImpactWater/MapServer/3",
            LoadAsServiceType: "dynamic"
        }, {
            ServiceURL: "http://tryitlive.arcgis.com/arcgis/rest/services/EnvironmentalImpactWater/MapServer/2",
            LoadAsServiceType: "dynamic"
        }, {
            ServiceURL: "http://tryitlive.arcgis.com/arcgis/rest/services/EnvironmentalImpactWater/MapServer/1",
            LoadAsServiceType: "dynamic"
        }, {
            ServiceURL: "http://tryitlive.arcgis.com/arcgis/rest/services/EnvironmentalImpactWater/MapServer/0",
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
	//                        When using the sample data, if you loaded it into a geodatabase format other than file geodatabase for publication, verify that the 
	//                        SummaryStatisticField matches the field name containing the shape’s area value (e.g. shape_area, shape.area(), etc)
        // SummaryStatisticFieldUnits: Specify units for SummaryStatisticField. Supported units are as listed below:
        //                             Length units: "YARDS", "FEET", "KILOMETERS", "METERS", "MILES", "NAUTICAL_MILES"
        //                             Area units: "SQUARE_FEET", "SQUARE_KILOMETERS", "SQUARE_METERS", "SQUARE_MILES", "SQUARE_YARDS", "HECTARES", "ACRES", "ARES"
        // DetailSummaryReportFields:  Specify fields to summarize on in the detailed summary report.
        // UnifiedSearch: Specify a Boolean value true/false which indicates whether to include the layer in Unified search or not.

        SearchSettings: [{
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "2",
            SearchDisplayTitle: "Seagrass Areas",
            SearchDisplayFields: "${DESCRIPT}",
            SearchExpression: "UPPER(DESCRIPT) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: ["DESCRIPT"],
            SummaryStatisticField: "SHAPE_Area",
			SummaryStatisticFieldUnits: "SQUARE_METERS",
            DetailSummaryReportFields: ["DESCRIPT", "SOURCEDT"],
            UnifiedSearch: "false"
        },{
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "3",
            SearchDisplayTitle: "Tidal Flats",
            SearchDisplayFields: "${DESCRIPT}",
            SearchExpression: "UPPER(DESCRIPT) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: ["DESCRIPT"],
            SummaryStatisticField: "SHAPE_Area",
			SummaryStatisticFieldUnits: "SQUARE_METERS",
            DetailSummaryReportFields: ["DESCRIPT", "SOURCEDT"],
            UnifiedSearch: "false"
        },{
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "4",
            SearchDisplayTitle: "Coral Hardbottom Areas",
            SearchDisplayFields: "${DESCRIPT}",
            SearchExpression: "UPPER(DESCRIPT) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: ["DESCRIPT"],
            SummaryStatisticField: "SHAPE_Area",
			SummaryStatisticFieldUnits: "SQUARE_METERS",
            DetailSummaryReportFields: ["DESCRIPT", "SOURCEDT"],
            UnifiedSearch: "false"
        },{
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "5",
            SearchDisplayTitle: "Mangrove Areas",
            SearchDisplayFields: "${DESCRIPT}",
            SearchExpression: "UPPER(DESCRIPT) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: ["DESCRIPT"],
            SummaryStatisticField: "SHAPE_Area",
			SummaryStatisticFieldUnits: "SQUARE_METERS",
            DetailSummaryReportFields: ["DESCRIPT", "SOURCEDT"],
            UnifiedSearch: "false"
        },{
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "6",
            SearchDisplayTitle: "Salt Marsh Areas",
            SearchDisplayFields: "${DESCRIPT}",
            SearchExpression: "UPPER(DESCRIPT) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: ["DESCRIPT"],
            SummaryStatisticField: "SHAPE_Area",
			SummaryStatisticFieldUnits: "SQUARE_METERS",
            DetailSummaryReportFields: ["DESCRIPT", "SOURCEDT"],
            UnifiedSearch: "false"
        },{
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "7",
            SearchDisplayTitle: "Conservation Areas",
            SearchDisplayFields: "${NAME}",
            SearchExpression: "UPPER(NAME) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: ["NAME", "MANAGER", "MGRINST"],
            SummaryStatisticField: "Shape_Area",
			SummaryStatisticFieldUnits: "SQUARE_METERS",
            DetailSummaryReportFields: ["SITEID", "NAME", "AREATYPE", "OWNER", "COUNTY", "MANAGER", "MGRINST", "MGRCITY", "MGRPHONE"],
            UnifiedSearch: "true"
        }, {
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "8",
            SearchDisplayTitle: "Marine Protected Areas",
            SearchDisplayFields: "${NAME}",
            SearchExpression: "UPPER(NAME) LIKE UPPER('%${0}%')",
            QuickSummaryReportFields: ["NAME", "MGMTAGENCY"],
            SummaryStatisticField: "Shape_Area",
			SummaryStatisticFieldUnits: "SQUARE_METERS",
            DetailSummaryReportFields: ["SITEID", "NAME", "GOVBODY", "MGMTAGENCY"],
            UnifiedSearch: "true"
        }],

        // Following zoom level will be set for the map upon searching an address
        ZoomLevel: 12,

        // Minimum height should be 250 for the info-popup in pixels
        InfoPopupHeight: 250,

        // Minimum width should be 300 for the info-popup in pixels
        InfoPopupWidth: 300,

        // Configure graphic color to be set for uploaded shapefile
        RendererColor: "28,134,238",

        // Configure graphic color to be set for buffer around AOI
        BufferSymbology: {
            FillSymbolColor: "255,0,0",
            FillSymbolTransparency: "0.10",
            LineSymbolColor: "255,0,0",
            LineSymbolTransparency: "0.30"
        },

        // Select feature symbol
        SelectFeatureSymbology: {
            SymbolColor: "0,255,255",
            SymbolWidth: "1"
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
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "0",
            InfoWindowHeaderField: "Boat Ramp",
            InfoWindowData: [{
		DisplayText: "Site ID:",
		FieldName: "${SITEID}"
	    }, {
		DisplayText: "Park Name:",
		FieldName: "${NAME}"
	    }, {
		DisplayText: "County",
		FieldName: "${COUNTY}"
	    }, {
		DisplayText: "Management Unit:",
		FieldName: "${MANAGEUNIT}"
	    }, {
		DisplayText: "Waterbody Name:",
		FieldName: "${WATERBODY}"
	    }, {
		DisplayText: "Owned By:",
		FieldName: "${OWNEDBY}"
	    }, {
		DisplayText: "Managed By:",
		FieldName: "${MAINTBY}"
	    }]
		}, {
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "1",
            InfoWindowHeaderField: "Marina",
            InfoWindowData:[{
		DisplayText: "Site ID:",
		FieldName: "${SITEID}"
	    },{
		DisplayText: "Park Name:",
		FieldName: "${NAME}"
	    },{
		DisplayText: "Phone Number:",
		FieldName: "${POCPHONE}"
	    },{
		DisplayText: "County:",
		FieldName: "${COUNTY}"
	    },{
		DisplayText: "Waterbody Type:",
		FieldName: "${WATERBODY}"
	    },{
		DisplayText: "Website:",
		FieldName: "${WATERURL}"
	    },{
		DisplayText: "Owned By:",
		FieldName: "${OWNEDBY}"
	    },{
		DisplayText: "Managed By:",
		FieldName: "${MAINTBY}"
	    }]
		}, {
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "2",
            InfoWindowHeaderField: "Seagrass",
            InfoWindowData:[{
		DisplayText: "Description:",
		FieldName: "${DESCRIPT}"
	    },{
		DisplayText: "Source Date:",
		FieldName: "${SOURCEDT}"
	    }]
		}, {
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "3",
            InfoWindowHeaderField: "Tidal Flat",
            InfoWindowData:[{
		DisplayText: "Description:",
		FieldName: "${DESCRIPT}"
	    },{
		DisplayText: "Source Date:",
		FieldName: "${SOURCEDT}"
	    }]
		}, {
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "4",
            InfoWindowHeaderField: "Coral Hardbottom",
            InfoWindowData:[{
		DisplayText: "Description:",
		FieldName: "${DESCRIPT}"
	    },{
		DisplayText: "Source Date:",
		FieldName: "${SOURCEDT}"
	    }]
		}, {
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "5",
            InfoWindowHeaderField: "Mangrove",
            InfoWindowData:[{
		DisplayText: "Description:",
		FieldName: "${DESCRIPT}"
	    },{
		DisplayText: "Source Date:",
		FieldName: "${SOURCEDT}"
	    }]
		}, {
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "6",
            InfoWindowHeaderField: "Salt Marsh",
            InfoWindowData:[{
		DisplayText: "Description:",
		FieldName: "${DESCRIPT}"
	    },{
		DisplayText: "Source Date:",
		FieldName: "${SOURCEDT}"
	    }]
		}, {
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "7",
            InfoWindowHeaderField: "Conservation Area",
            InfoWindowData:[{
		DisplayText: "Site ID:",
		FieldName: "${SITEID}"
	    },{
		DisplayText: "Name:",
		FieldName: "${NAME}"
	    },{
		DisplayText: "Type:",
		FieldName: "${AREATYPE}"
	    },{
		DisplayText: "Owner:",
		FieldName: "${OWNER}"
	    },{
		DisplayText: "Total Acres:",
		FieldName: "${TOTACRES}"
	    },{
		DisplayText: "County:",
		FieldName: "${COUNTY}"
	    },{
		DisplayText: "Manager Name:",
		FieldName: "${MANAGER}"
	    },{
		DisplayText: "Managing Institution:",
		FieldName: "${MGRINST}"
	    },{
		DisplayText: "Managing City:",
		FieldName: "${MGRCITY}"
	    },{
		DisplayText: "Phone Number:",
		FieldName: "${MGRPHONE}"
	    },{
		DisplayText: "Website:",
		FieldName: "${WEBSITE}"
	    }]
		}, {
            Title: "EnvironmentalImpactWater",
            QueryLayerId: "8",
            InfoWindowHeaderField: "Marine Protected Area",
            InfoWindowData:[{
		DisplayText: "Site ID:",
		FieldName: "${SITEID}"
	    },{
		DisplayText: "Site Name:",
		FieldName: "${NAME}"
	    },{
		DisplayText: "Area (sq km):",
		FieldName: "${AREAKM}"
	    },{
		DisplayText: "Government Level:",
		FieldName: "${GOVBODY}"
	    },{
		DisplayText: "Management Plan:",
		FieldName: "${MGMTPLAN}"
	    },{
		DisplayText: "Management Agency:",
		FieldName: "${MGMTAGENCY}"
	    },{
		DisplayText: "Conservation Focus:",
		FieldName: "${CONFOCUS}"
	    },{
		DisplayText: "Conservation Target:",
		FieldName: "${CONTARGET}"
	    },{
		DisplayText: "Year Established:",
		FieldName: "${ESTYEAR}"
	    },{
		DisplayText: "Website:",
		FieldName: "${URL}"
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
            LocatorDefaultAddress: "SE 13th St, Miami, FL",
            LocatorDefaultPlaceNameSearchAddress: "Largo, Florida",
            LocatorDefaultAOIAddress: "Sun City, Florida",
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

        // ------------------------------------------------------------------------------------------------------------------------
        // GEOMETRY SERVICE SETTINGS
        // ------------------------------------------------------------------------------------------------------------------------

        // Set geometry service URL
        GeometryService: "http://tasks.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer",

        // Set GP service for creating AOI from shapefile and uploading shapefile for analysis
        ShapefileTools: "http://54.203.249.87/arcgis/rest/services/ShapefileTools/GPServer/ShapefileTools",

        // ReportDownloadSettings: Settings for downloading quick and detailed summary reports in PDF format
        // GPServiceURL: url to geoprocessing service
        ReportDownloadSettings: {
            GPServiceURL: "http://54.203.249.87/arcgis/rest/services/GenerateImpactReportWater/GPServer/GenerateImpactReport",
            ReportSettings: [
                {
                    Type: "Quick",
                    Label: "Quick Summary"
                },
                {
                    Type: "Detailed",
                    Label: "Detailed Summary"
                }
            ]
        },

        // Supported formats for downloading the report
        // Enabled: Allowed values are true, false
        // Label: Specify label to displayed in the application for this data format
        // Format: Allowed values are Excel, File Geodatabase - GDB - .gdb, Shapefile - SHP - .shp or any other as supported by the clip zip and ship service
        // GPServiceURL: Specify url to geoprocessing service
        DataDownloadSettings: [
            {
                Enabled: true,
                Label: "Excel",
                Format: "Excel",
                GPServiceURL: "http://54.203.249.87/arcgis/rest/services/ClipToExcelWater/GPServer/ClipToExcel"
            },
            {
                Enabled: true,
                Label: "File GDB",
                Format: "File Geodatabase - GDB - .gdb",
                GPServiceURL: "http://54.203.249.87/arcgis/rest/services/ExtractDataTaskWater/GPServer/Extract%20Data%20Task"
            },
            {
                Enabled: true,
                Label: "Shapefile",
                Format: "Shapefile - SHP - .shp",
                GPServiceURL: "http://54.203.249.87/arcgis/rest/services/ExtractDataTaskWater/GPServer/Extract%20Data%20Task"
            }
        ],

        // ------------------------------------------------------------------------------------------------------------------------
        // SETTINGS FOR MAP SHARING
        // ------------------------------------------------------------------------------------------------------------------------
        // Set URL for TinyURL service, and URLs for social media
        MapSharingOptions: {
            TinyURLServiceURL: "https://api-ssl.bitly.com/v3/shorten?longUrl=${0}",
            TinyURLResponseAttribute: "data.url",
            FacebookShareURL: "http://www.facebook.com/sharer.php?u=${0}&t=Environmental%20Impact",
            TwitterShareURL: "http://mobile.twitter.com/compose/tweet?status=Environmental%20Impact ${0}",
            ShareByMailLink: "mailto:%20?subject=Check%20out%20this%20map!&body=${0}"
        },

        //------------------------------------------------------------------------------------------------------------------------
        // Header Widget Settings
        //------------------------------------------------------------------------------------------------------------------------
        // Set widgets settings such as widget title, widgetPath, mapInstanceRequired to be displayed in header panel
        // WidgetPath: path of the widget respective to the widgets package.
        AppHeaderWidgets: [{
            WidgetPath: "widgets/locator/locator"
        }, {
            WidgetPath: "widgets/reports/reports"
        }, {
            WidgetPath: "widgets/geoLocation/geoLocation"
        }, {
            WidgetPath: "widgets/share/share"
        }, {
            WidgetPath: "widgets/help/help"
        }]
    };
});
