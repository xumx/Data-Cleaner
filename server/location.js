Server = {};

Server.fetching = [];

NullCity = {
    '_id': 'small town',
    'lat': 0,
    'lon': 0,
    'country': "not found",
    'population': 0,
    'name': 'not found',
    'ascii': 'not found'
};

Server.codeToCountry = {
    "not found": "not found",
    "Not Found": "not found",
    "AF": "Afghanistan",
    "AX": "Åland Islands",
    "AL": "Albania",
    "DZ": "Algeria",
    "AS": "American Samoa",
    "AD": "AndorrA",
    "AO": "Angola",
    "AI": "Anguilla",
    "AQ": "Antarctica",
    "AG": "Antigua and Barbuda",
    "AR": "Argentina",
    "AM": "Armenia",
    "AW": "Aruba",
    "AU": "Australia",
    "AT": "Austria",
    "AZ": "Azerbaijan",
    "BS": "Bahamas",
    "BH": "Bahrain",
    "BD": "Bangladesh",
    "BB": "Barbados",
    "BY": "Belarus",
    "BE": "Belgium",
    "BZ": "Belize",
    "BJ": "Benin",
    "BM": "Bermuda",
    "BT": "Bhutan",
    "BO": "Bolivia",
    "BA": "Bosnia and Herzegovina",
    "BW": "Botswana",
    "BV": "Bouvet Island",
    "BR": "Brazil",
    "IO": "British Indian Ocean Territory",
    "BN": "Brunei Darussalam",
    "BG": "Bulgaria",
    "BF": "Burkina Faso",
    "BI": "Burundi",
    "KH": "Cambodia",
    "CM": "Cameroon",
    "CA": "Canada",
    "CV": "Cape Verde",
    "KY": "Cayman Islands",
    "CF": "Central African Republic",
    "TD": "Chad",
    "CL": "Chile",
    "CN": "China",
    "CX": "Christmas Island",
    "CC": "Cocos (Keeling) Islands",
    "CO": "Colombia",
    "KM": "Comoros",
    "CG": "Congo",
    "CD": "Congo, The Democratic Republic of the",
    "CK": "Cook Islands",
    "CR": "Costa Rica",
    "CI": "Cote D\"Ivoire",
    "HR": "Croatia",
    "CU": "Cuba",
    "CY": "Cyprus",
    "CZ": "Czech Republic",
    "DK": "Denmark",
    "DJ": "Djibouti",
    "DM": "Dominica",
    "DO": "Dominican Republic",
    "EC": "Ecuador",
    "EG": "Egypt",
    "SV": "El Salvador",
    "GQ": "Equatorial Guinea",
    "ER": "Eritrea",
    "EE": "Estonia",
    "ET": "Ethiopia",
    "FK": "Falkland Islands (Malvinas)",
    "FO": "Faroe Islands",
    "FJ": "Fiji",
    "FI": "Finland",
    "FR": "France",
    "GF": "French Guiana",
    "PF": "French Polynesia",
    "TF": "French Southern Territories",
    "GA": "Gabon",
    "GM": "Gambia",
    "GE": "Georgia",
    "DE": "Germany",
    "GH": "Ghana",
    "GI": "Gibraltar",
    "GR": "Greece",
    "GL": "Greenland",
    "GD": "Grenada",
    "GP": "Guadeloupe",
    "GU": "Guam",
    "GT": "Guatemala",
    "GG": "Guernsey",
    "GN": "Guinea",
    "GW": "Guinea-Bissau",
    "GY": "Guyana",
    "HT": "Haiti",
    "HM": "Heard Island and Mcdonald Islands",
    "VA": "Holy See (Vatican City State)",
    "HN": "Honduras",
    "HK": "Hong Kong",
    "HU": "Hungary",
    "IS": "Iceland",
    "IN": "India",
    "ID": "Indonesia",
    "IR": "Iran, Islamic Republic Of",
    "IQ": "Iraq",
    "IE": "Ireland",
    "IM": "Isle of Man",
    "IL": "Israel",
    "IT": "Italy",
    "JM": "Jamaica",
    "JP": "Japan",
    "JE": "Jersey",
    "JO": "Jordan",
    "KZ": "Kazakhstan",
    "KE": "Kenya",
    "KI": "Kiribati",
    "KP": "Korea, Democratic People\"S Republic of",
    "KR": "Korea, Republic of",
    "KW": "Kuwait",
    "KG": "Kyrgyzstan",
    "LA": "Lao People\"S Democratic Republic",
    "LV": "Latvia",
    "LB": "Lebanon",
    "LS": "Lesotho",
    "LR": "Liberia",
    "LY": "Libyan Arab Jamahiriya",
    "LI": "Liechtenstein",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "MO": "Macao",
    "MK": "Macedonia, The Former Yugoslav Republic of",
    "MG": "Madagascar",
    "MW": "Malawi",
    "MY": "Malaysia",
    "MV": "Maldives",
    "ML": "Mali",
    "MT": "Malta",
    "MH": "Marshall Islands",
    "MQ": "Martinique",
    "MR": "Mauritania",
    "MU": "Mauritius",
    "YT": "Mayotte",
    "MX": "Mexico",
    "FM": "Micronesia, Federated States of",
    "MD": "Moldova, Republic of",
    "MC": "Monaco",
    "MN": "Mongolia",
    "MS": "Montserrat",
    "MA": "Morocco",
    "MZ": "Mozambique",
    "MM": "Myanmar",
    "NA": "Namibia",
    "NR": "Nauru",
    "NP": "Nepal",
    "NL": "Netherlands",
    "AN": "Netherlands Antilles",
    "NC": "New Caledonia",
    "NZ": "New Zealand",
    "NI": "Nicaragua",
    "NE": "Niger",
    "NG": "Nigeria",
    "NU": "Niue",
    "NF": "Norfolk Island",
    "MP": "Northern Mariana Islands",
    "NO": "Norway",
    "OM": "Oman",
    "PK": "Pakistan",
    "PW": "Palau",
    "PS": "Palestinian Territory, Occupied",
    "PA": "Panama",
    "PG": "Papua New Guinea",
    "PY": "Paraguay",
    "PE": "Peru",
    "PH": "Philippines",
    "PN": "Pitcairn",
    "PL": "Poland",
    "PT": "Portugal",
    "PR": "Puerto Rico",
    "QA": "Qatar",
    "RE": "Reunion",
    "RO": "Romania",
    "RU": "Russian Federation",
    "RW": "RWANDA",
    "SH": "Saint Helena",
    "KN": "Saint Kitts and Nevis",
    "LC": "Saint Lucia",
    "PM": "Saint Pierre and Miquelon",
    "VC": "Saint Vincent and the Grenadines",
    "WS": "Samoa",
    "SM": "San Marino",
    "ST": "Sao Tome and Principe",
    "SA": "Saudi Arabia",
    "SN": "Senegal",
    "CS": "Serbia and Montenegro",
    "SC": "Seychelles",
    "SL": "Sierra Leone",
    "SG": "Singapore",
    "SK": "Slovakia",
    "SI": "Slovenia",
    "SB": "Solomon Islands",
    "SO": "Somalia",
    "ZA": "South Africa",
    "GS": "South Georgia and the South Sandwich Islands",
    "ES": "Spain",
    "LK": "Sri Lanka",
    "SD": "Sudan",
    "SR": "Suriname",
    "SJ": "Svalbard and Jan Mayen",
    "SZ": "Swaziland",
    "SE": "Sweden",
    "CH": "Switzerland",
    "SY": "Syrian Arab Republic",
    "TW": "Taiwan, Province of China",
    "TJ": "Tajikistan",
    "TZ": "Tanzania, United Republic of",
    "TH": "Thailand",
    "TL": "Timor-Leste",
    "TG": "Togo",
    "TK": "Tokelau",
    "TO": "Tonga",
    "TT": "Trinidad and Tobago",
    "TN": "Tunisia",
    "TR": "Turkey",
    "TM": "Turkmenistan",
    "TC": "Turks and Caicos Islands",
    "TV": "Tuvalu",
    "UG": "Uganda",
    "UA": "Ukraine",
    "AE": "United Arab Emirates",
    "GB": "United Kingdom",
    "US": "United States",
    "UM": "United States Minor Outlying Islands",
    "UY": "Uruguay",
    "UZ": "Uzbekistan",
    "VU": "Vanuatu",
    "VE": "Venezuela",
    "VN": "Viet Nam",
    "VG": "Virgin Islands, British",
    "VI": "Virgin Islands, U.S.",
    "WF": "Wallis and Futuna",
    "EH": "Western Sahara",
    "YE": "Yemen",
    "ZM": "Zambia",
    "ZW": "Zimbabwe"
};

Server.codeToContinent = {
    'AF': 'AS',
    'AX': 'EU',
    'AL': 'EU',
    'DZ': 'AF',
    'AS': 'OC',
    'AD': 'EU',
    'AO': 'AF',
    'AI': 'NA',
    'AQ': 'AN',
    'AG': 'NA',
    'AR': 'SA',
    'AM': 'AS',
    'AW': 'NA',
    'AU': 'OC',
    'AT': 'EU',
    'AZ': 'AS',
    'BS': 'NA',
    'BH': 'AS',
    'BD': 'AS',
    'BB': 'NA',
    'BY': 'EU',
    'BE': 'EU',
    'BZ': 'NA',
    'BJ': 'AF',
    'BM': 'NA',
    'BT': 'AS',
    'BO': 'SA',
    'BQ': 'NA',
    'BA': 'EU',
    'BW': 'AF',
    'BV': 'AN',
    'BR': 'SA',
    'IO': 'AS',
    'VG': 'NA',
    'BN': 'AS',
    'BG': 'EU',
    'BF': 'AF',
    'BI': 'AF',
    'KH': 'AS',
    'CM': 'AF',
    'CA': 'NA',
    'CV': 'AF',
    'KY': 'NA',
    'CF': 'AF',
    'TD': 'AF',
    'CL': 'SA',
    'CN': 'AS',
    'CX': 'AS',
    'CC': 'AS',
    'CO': 'SA',
    'KM': 'AF',
    'CD': 'AF',
    'CG': 'AF',
    'CK': 'OC',
    'CR': 'NA',
    'CI': 'AF',
    'HR': 'EU',
    'CU': 'NA',
    'CW': 'NA',
    'CY': 'AS',
    'CZ': 'EU',
    'DK': 'EU',
    'DJ': 'AF',
    'DM': 'NA',
    'DO': 'NA',
    'EC': 'SA',
    'EG': 'AF',
    'SV': 'NA',
    'GQ': 'AF',
    'ER': 'AF',
    'EE': 'EU',
    'ET': 'AF',
    'FO': 'EU',
    'FK': 'SA',
    'FJ': 'OC',
    'FI': 'EU',
    'FR': 'EU',
    'GF': 'SA',
    'PF': 'OC',
    'TF': 'AN',
    'GA': 'AF',
    'GM': 'AF',
    'GE': 'AS',
    'DE': 'EU',
    'GH': 'AF',
    'GI': 'EU',
    'GR': 'EU',
    'GL': 'NA',
    'GD': 'NA',
    'GP': 'NA',
    'GU': 'OC',
    'GT': 'NA',
    'GG': 'EU',
    'GN': 'AF',
    'GW': 'AF',
    'GY': 'SA',
    'HT': 'NA',
    'HM': 'AN',
    'VA': 'EU',
    'HN': 'NA',
    'HK': 'AS',
    'HU': 'EU',
    'IS': 'EU',
    'IN': 'AS',
    'ID': 'AS',
    'IR': 'AS',
    'IQ': 'AS',
    'IE': 'EU',
    'IM': 'EU',
    'IL': 'AS',
    'IT': 'EU',
    'JM': 'NA',
    'JP': 'AS',
    'JE': 'EU',
    'JO': 'AS',
    'KZ': 'AS',
    'KE': 'AF',
    'KI': 'OC',
    'KP': 'AS',
    'KR': 'AS',
    'KW': 'AS',
    'KG': 'AS',
    'LA': 'AS',
    'LV': 'EU',
    'LB': 'AS',
    'LS': 'AF',
    'LR': 'AF',
    'LY': 'AF',
    'LI': 'EU',
    'LT': 'EU',
    'LU': 'EU',
    'MO': 'AS',
    'MK': 'EU',
    'MG': 'AF',
    'MW': 'AF',
    'MY': 'AS',
    'MV': 'AS',
    'ML': 'AF',
    'MT': 'EU',
    'MH': 'OC',
    'MQ': 'NA',
    'MR': 'AF',
    'MU': 'AF',
    'YT': 'AF',
    'MX': 'NA',
    'FM': 'OC',
    'MD': 'EU',
    'MC': 'EU',
    'MN': 'AS',
    'ME': 'EU',
    'MS': 'NA',
    'MA': 'AF',
    'MZ': 'AF',
    'MM': 'AS',
    'NA': 'AF',
    'NR': 'OC',
    'NP': 'AS',
    'NL': 'EU',
    'NC': 'OC',
    'NZ': 'OC',
    'NI': 'NA',
    'NE': 'AF',
    'NG': 'AF',
    'NU': 'OC',
    'NF': 'OC',
    'MP': 'OC',
    'NO': 'EU',
    'OM': 'AS',
    'PK': 'AS',
    'PW': 'OC',
    'PS': 'AS',
    'PA': 'NA',
    'PG': 'OC',
    'PY': 'SA',
    'PE': 'SA',
    'PH': 'AS',
    'PN': 'OC',
    'PL': 'EU',
    'PT': 'EU',
    'PR': 'NA',
    'QA': 'AS',
    'RE': 'AF',
    'RO': 'EU',
    'RU': 'EU',
    'RW': 'AF',
    'BL': 'NA',
    'SH': 'AF',
    'KN': 'NA',
    'LC': 'NA',
    'MF': 'NA',
    'PM': 'NA',
    'VC': 'NA',
    'WS': 'OC',
    'SM': 'EU',
    'ST': 'AF',
    'SA': 'AS',
    'SN': 'AF',
    'RS': 'EU',
    'SC': 'AF',
    'SL': 'AF',
    'SG': 'AS',
    'SX': 'NA',
    'SK': 'EU',
    'SI': 'EU',
    'SB': 'OC',
    'SO': 'AF',
    'ZA': 'AF',
    'GS': 'AN',
    'SS': 'AF',
    'ES': 'EU',
    'LK': 'AS',
    'SD': 'AF',
    'SR': 'SA',
    'SJ': 'EU',
    'SZ': 'AF',
    'SE': 'EU',
    'CH': 'EU',
    'SY': 'AS',
    'TW': 'AS',
    'TJ': 'AS',
    'TZ': 'AF',
    'TH': 'AS',
    'TL': 'AS',
    'TG': 'AF',
    'TK': 'OC',
    'TO': 'OC',
    'TT': 'NA',
    'TN': 'AF',
    'TR': 'AS',
    'TM': 'AS',
    'TC': 'NA',
    'TV': 'OC',
    'UG': 'AF',
    'UA': 'EU',
    'AE': 'AS',
    'GB': 'EU',
    'US': 'NA',
    'UM': 'OC',
    'VI': 'NA',
    'UY': 'SA',
    'UZ': 'AS',
    'VU': 'OC',
    'VE': 'SA',
    'VN': 'AS',
    'WF': 'OC',
    'EH': 'AF',
    'YE': 'AS',
    'ZM': 'AF',
    'ZW': 'AF'
};

Server.landBridgeMatrix = [
    ['AS', 'EU'],
    ['NA', 'SA']
];

Server.findLocation = function(string, type) {

    if (string === '' || string == null) {
        return '';
    }

    if (string.match(/.+(?=,)/)) {
        string = string.match(/.+(?=,)/)[0];
    }

    var result = Cities.findOne({
        ascii: string
    }, {
        sort: {
            population: -1
        }
    });

    if (!result) {

        result = Cities.findOne({
            alt: {
                $regex: new RegExp("\\b" + string + "\\b", "i")
            }
        }, {
            sort: {
                population: -1
            }
        });
    }

    if (result) {
        if (type) {
            return result[type];
        } else {
            return [result.lat, result.lon];
        }
    } else {
        result = Meteor.call('resolveLocation', string);

        if (type) {
            return result[type];
        } else {
            return [result.lat, result.lon];
        }
    }
};

Server.checkLandBridge = function(a, b) {
    _.find(Server.landBridgeMatrix, function(value, key, list) {
        if (_.contains(value, Server.codeToContinent(a)) && _.contains(value, Server.codeToContinent(b))) {
            if (a !== b) {
                // if (_.contains(Server.landBridgeExclusionList, a);)
            }

            return true;
        }
    });
};

Server.loadData = function() {
    var csv = Meteor.require('csv');
    var text = Assets.getText('cities.csv');

    csv().from.string(text).to.array(Meteor.bindEnvironment(function(data) {
        _.each(data, function(row, index, list) {
            Cities.insert({
                '_id': row[0],
                'name': row[1],
                'ascii': row[2],
                'alt': row[3],
                'lat': parseFloat(row[4]),
                'lon': parseFloat(row[5]),
                'country': row[6],
                'population': parseInt(row[7])
            });
        });
    }, function(error) {
        console.log('Error in bindEnvironment:', error);
    }));

    return Cities.find({}).count();
};

Server.flushCities = function() {
    Cities.remove({});
    // return Server.loadData();
};

Server.resolveLocation = function(name) {
    console.log("resolving location " + name);
    var url = 'http://api.geonames.org/search?fuzzy=0.7&maxRows=10&type=json&orderby=relevance&username=gtl_builder&q=' + name;
    var elem;

    Server.fetching.push(name);

    response = Meteor.http.get(url);

    //Sort by population
    var city = _.max(response.data.geonames, function(place) {
        return place.population;
    });

    if (response.data.geonames.length > 0) {

        console.log(city);

        if (city.population < 50000) {
            elem = Cities.findOne({
                _id: "small town"
            });

            if (elem == undefined) {
                Cities.insert(NullCity);
            } else {
                Cities.update({
                    _id: "small town"
                }, {
                    $set: {
                        alt: elem.alt + ',' + name,
                    }
                });
            }

            return NullCity;
        } else {

            elem = Cities.findOne({
                name: city.name,
                country: city.countryCode
            });

            Cities.update({
                _id: elem._id
            }, {
                $set: {
                    alt: elem.alt + ',' + name
                }
            });

            return elem;
        }
    } else {
        elem = Cities.findOne({
            _id: "not found"
        });

        if (elem == undefined) {
            Cities.insert(NullCity);
        } else {
            Cities.update({
                _id: "not found"
            }, {
                $set: {
                    alt: elem.alt + ',' + name,
                }
            });
        }

        console.log("location not found ", name);
        return NullCity;
    }

    Server.fetching = _.without(Server.fetching, name);
};

Server.debug = function(string, type) {
    var result = Cities.findOne({
        ascii: string
    }, {
        sort: {
            population: -1
        }
    });


    if (!result) {

        result = Cities.findOne({
            alt: {
                $regex: new RegExp(string, "i")
            }
        }, {
            sort: {
                population: -1
            }
        });
    }

    console.log(result);
    return result;
};
