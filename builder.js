//Row number
//Fixed complete %
//Blacklist/whitelist

// Location bug fix
// Road Bridge

debug = null;

Schemas = new Meteor.Collection('schema');
Datafiles = new CollectionFS('datafile');

Cities = new Meteor.Collection('cities');
Status = new Meteor.Collection('status');

var _DATE_REGEXP = '^(19|20)\\d\\d([- /.])(0[1-9]|1[012])\\2(0[1-9]|[12][0-9]|3[01])$';
var DATE_FORMAT = 'YYYY-MM-DD';

var JSONfn = {
    stringify: function(obj) {
        return JSON.stringify(obj, function(key, value) {
            return (typeof value === 'function') ? value.toString() : value;
        });
    },

    parse: function(str) {
        return JSON.parse(str, function(key, value) {
            if (typeof value != 'string') return value;
            return (value.substring(0, 8) == 'function') ? eval('(' + value + ')') : value;
        });
    }
};

if (Meteor.isClient) {

    var rawHeader, goal, current, csvData, preview_table, cursor;

    Meteor.subscribe('data');

    Operators = {
        plus: {
            type: 'operator',
            text: '+',
            fn: function(a, b) {
                if (a._isAMomentObject && b.unit && Server.isNumber(b.value)) {
                    return a.add(b.unit, b.value);
                } else {
                    return a + b;
                }
            }
        },
        day: {
            type: 'unit',
            text: 'days',
            fn: function(a) {
                return {
                    value: a,
                    unit: "days"
                };
            }
        },
        week: {
            type: 'unit',
            text: 'week',
            fn: function(a) {
                return {
                    value: a,
                    unit: "weeks"
                };
            }
        },
        minus: {
            type: 'operator',
            text: '-',
            fn: function(a, b) {
                if (a._isAMomentObject && b.unit && Server.isNumber(b.value)) {
                    return a.subtract(b.unit, b.value);
                } else {
                    return a + b;
                }
            }
        },
        divide: {
            type: 'operator',
            text: '/',
            fn: function(a, b) {
                return a / b;
            }
        },
        multiply: {
            type: 'operator',
            text: 'x',
            fn: function(a, b) {
                return a * b;
            }
        },
        equals: {
            type: 'operator',
            text: 'is equals to',
            fn: function(a, b) {
                if (typeof b == 'string') {
                    if (b.indexOf(',') > -1) {
                        var array = b.split(',');

                        array = _.map(array, function(n) {
                            return n.trim();
                        });

                        return _.contains(array, a);
                    } else {
                        return a == b;
                    }
                } else {
                    return a == b;
                }
            }
        },
        greater: {
            type: 'operator',
            text: 'is greater than',
            fn: function(a, b) {
                return a > b;
            }
        },
        less: {
            type: 'operator',
            text: 'is less than',
            fn: function(a, b) {
                return a < b;
            }
        },
        upper: {
            type: 'transform',
            text: 'to uppercase',
            fn: function(a) {
                return a.toUpperCase();
            }
        },

        cityname: {
            type: 'transform',
            text: '\'s city name',
            fn: function(a) {
                return Meteor.call('findLocation', a, 'name');
            }
        },
        rownumber: {
            type: 'field',
            subtype: 'rindex',
            text: 'row number'
        },
        location: {
            type: 'transform',
            text: 'to location',
            fn: function(a) {
                return Meteor.call('findLocation', a);
            }
        },
        countrycode: {
            type: 'transform',
            text: '\'s country code',
            fn: function(a) {
                return Meteor.call('findLocation', a, 'country');
            }
        },
        lat: {
            type: 'transform',
            text: '\'s lat',
            fn: function(a) {
                return Meteor.call('findLocation', a, 'lat');
            }
        },
        lon: {
            type: 'transform',
            text: '\'s lon',
            fn: function(a) {
                return Meteor.call('findLocation', a, 'lon');
            }
        },
        country: {
            type: 'transform',
            text: 'to country',
            fn: function(a) {
                return Server.codeToCountry[a];
            }
        },
        blank: {
            type: 'transform',
            text: 'is blank',
            fn: function(a) {
                var isBlank = false;

                isBlank = isBlank || a === undefined || a === null;

                if (typeof a == 'string') {
                    isBlank = isBlank || a.match(/^\s*$/).length > 0;
                }

                return isBlank;
            }
        },
        contain: {
            type: 'operator',
            text: 'contains',
            fn: function(a, b) {
                if (typeof a == 'string') {
                    return a.match(b) ? true : false;
                } else {
                    return false;
                }
            }
        },
        average: [{
            type: 'lookup',
            text: 'average value of',
            fn: function(value, column, summary) {
                return summary.average[column];
            }
        }, {
            type: 'field'
        }],
        total: {
            type: 'lookup',
            text: '\'s total value',
            fn: function(value, column, summary) {
                return summary.sum[column];
            }
        },
        extract: [{
            type: 'field'
        }, {
            type: 'operator',
            text: '\'s numeric value at position',
            fn: function(a, b) {
                try {
                    b = parseInt(b);

                    if (typeof a == 'string') {
                        var match = a.match(/(\d+(\.\d+)?)/g);
                        if (match) {
                            return match[b - 1];
                        } else {
                            return '';
                        }
                    } else {
                        return '';
                    }
                } catch (e) {
                    return '';
                }
            }
        }, {
            type: 'constant'
        }],
        count: [{
            type: 'constant'
        }, {
            type: 'operator',
            text: '\'s number of occurance in',
            fn: function(a, b) {
                var match = b.match(new RegExp(a, "g"));
                if (match) {
                    return match.length;
                } else {
                    return 0;
                }
            }
        }, {
            type: 'field'
        }],
        replace: [{
            type: 'operator',
            text: 'replace all',
            fn: function(source, pattern) {
                var re = new RegExp(pattern, 'g');
                return source.replace(re, '___');
            }
        }, {
            type: 'constant'
        }, {
            type: 'operator',
            text: 'with',
            fn: function(source, target) {
                return source.replace(/___/g, target);
            }
        }, {
            type: 'constant'
        }],
        field: {
            type: 'field'
        },
        constant: {
            type: 'constant',
        },
        condition: function() {
            return {
                type: 'condition',
                'if': [],
                'then': [],
                'else': []
            };
        }
    };

    Client = {
        isNumber: function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        },

        goto: function(number) {
            $('html,body').animate({
                scrollTop: $('#section' + number).position().top
            }, 500);
        },

        add: function(key) {
            var op = Operators[key];

            if (op instanceof Array) {
                for (var i = 0; i < op.length; i++) {
                    cursor.push(_.clone(op[i]));
                }
            } else if (typeof op == 'function') {
                cursor.push(op());
            } else {
                cursor.push(_.clone(op));
            }

            Client.modified = true;
            Client.render();
        },

        processCSV: function(csv) {
            //Convert data into 2D array
            csvData = $.csv2Array(csv);
            rawHeader = csvData.shift();

            _.defer(function() {
                _.each(rawHeader.reverse(), function(row, index) {
                    var tag = $('<div class="badge badge-info">' + row + '</div>').on('click', function() {
                        cursor.push({
                            type: 'field',
                            text: row,
                            col: rawHeader.length - index - 1
                        });
                        Client.modified = true;
                        Client.render();
                    });

                    $('#tagcloud').prepend(tag);
                });
            });
        },

        render: function() {
            $('.map').empty();
            $('.goal').text(current.header).click(function() {
                cursor = current.statement;
            });
            $('.map').append($(Client.statementToHTML(current.statement)));

            //Binding
            var val = $('#validation');

            if (current.validation.allowBlank) {
                val.find('[name=allowBlank]').prop('checked', true);
            } else {
                val.find('[name=allowBlank]').prop('checked', false);
            }

            if (current.validation.type != null) {
                val.find('[name=type][value=' + current.validation.type + ']').prop('checked', true);
            } else {
                val.find('[name=type]').prop('checked', false);
            }

            if (current.validation.targetDateFormat != null) {
                $('#target-date-format').val(current.validation.targetDateFormat);
            }

            if (current.validation.sourceDateFormat != null) {
                $('#source-date-format').val(current.validation.sourceDateFormat);
            }

            if (current.validation.fixedLength != null) {
                val.find('[name=hasFixedLength]').prop('checked', true);
                val.find('[name=fixedLength]').val(current.validation.fixedLength).show();
            } else {
                val.find('[name=hasFixedLength]').prop('checked', false);
                val.find('[name=fixedLength]').val(null).hide();
            }


            if (current.validation.maxValue != null) {
                val.find('[name=hasMaxValue]').prop('checked', true);
                val.find('[name=maxValue]').val(current.validation.maxValue).show();
            } else {
                val.find('[name=hasMaxValue]').prop('checked', false);
                val.find('[name=maxValue]').val(null).hide();
            }


            if (current.validation.minValue != null) {
                val.find('[name=hasMinValue]').prop('checked', true);
                val.find('[name=minValue]').val(current.validation.minValue).show();
            } else {
                val.find('[name=hasMinValue]').prop('checked', false);
                val.find('[name=minValue]').val(current.validation.minValue).hide();
            }


            if (current.validation.pattern != null) {
                val.find('[name=hasPattern]').prop('checked', true);
                val.find('[name=pattern]').val(current.validation.pattern).show();
            } else {
                val.find('[name=hasPattern]').prop('checked', false);
                val.find('[name=pattern]').val(null).hide();
            }


            if (current.validation.dictionary != null) {
                val.find('[name=hasDictionary]').prop('checked', true);
                val.find('[name=dictionary]').val(current.validation.dictionary.join('\n')).show();
            } else {
                val.find('[name=hasDictionary]').prop('checked', false);
                val.find('[name=dictionary]').val('').hide();
            }

            if (current.validation.excludeDictionary != null) {
                val.find('[name=hasExcludeDictionary]').prop('checked', true);
                val.find('[name=excludeDictionary]').val(current.validation.excludeDictionary.join('\n')).show();
            } else {
                val.find('[name=hasExcludeDictionary]').prop('checked', false);
                val.find('[name=excludeDictionary]').val('').hide();
            }


            $('.map input.alizarin, .map input.emerald').typeahead({
                source: rawHeader,
                minLength: 0
            });

            //Resize input box to fit text
            _.each($('.map input'), function(item) {
                var maxSize = 25;
                var size = ($(item).val().length > 25) ? 25 : $(item).val().length;
                $(item).attr('size', size);
            });

            TogetherJS.reinitialize();
        },

        saveGoal: function(goal) {
            var schema = prompt('Schema Name');

            if (schema) {
                Schemas.insert({
                    schema: schema,
                    customer: null,
                    goal: JSONfn.stringify(goal),
                    owner: Meteor.userId()
                });
            }
        },

        updateGoal: function(goal) {
            var pagingOptions = {
                bootstrapMajorVersion: 3,
                alignment: 'center',
                size: 'medium',
                totalPages: goal.length,
                numberOfPages: 8,

                itemTexts: function(type, page, current) {
                    switch (type) {
                        case "first":
                            return "<<";
                        case "prev":
                            return "<";
                        case "next":
                            return ">";
                        case "last":
                            return ">>";
                        case "page":
                            return goal[page - 1].header;
                    }
                },

                onPageClicked: function(e, originalEvent, type, page) {
                    var index = page - 1;
                    current = goal[index];
                    cursor = current.statement;
                    Client.render();

                    console.log(originalEvent.target);

                    // originalEvent.target.dispatchEvent(originalEvent);
                    $('#source-date-format').val(current.validation.sourceDateFormat);
                    $('#target-date-format').val(current.validation.targetDateFormat);
                }
            };

            $('#paging').bootstrapPaginator(pagingOptions);

            var colSettings = _.map(goal, function(g) {
                var validator = function(value, callback) {
                    var validation = g.validation;
                    var isBlank;

                    if (value === '' || value === undefined || value === null) {
                        isBlank = true;
                    }

                    if (validation.allowBlank === false && isBlank) {
                        callback(false);
                    } else if (validation.allowBlank === true && isBlank) {
                        callback(true);
                    } else if (validation.fixedLength !== null && value.length != validation.fixedLength) {
                        callback(false);
                    } else if (validation.pattern !== null && typeof value == 'string' && !value.match(new RegExp(validation.pattern))) {
                        callback(false);
                    } else if (validation.type !== null) {
                        //TODO
                        callback(true);
                    } else if (validation.targetDateFormat !== null && !moment(validation.targetDateFormat, value).isValid()) {
                        callback(true);
                    } else if (validation.maxValue !== null && parseFloat(value) > validation.maxValue) {
                        callback(false);
                    } else if (validation.minValue !== null && parseFloat(value) < validation.minValue) {
                        callback(false);
                    } else if (validation.dictionary !== null && !_.contains(validation.dictionary, value)) {
                        callback(false);
                    } else if (validation.excludeDictionary != null && _.contains(validation.excludeDictionary, value)) {
                        callback(false);
                    } else {
                        callback(true);
                    }
                };

                return {
                    validator: validator,
                    allowInvalid: true
                };
            });

            var headers = _.pluck(goal, 'header');

            $('.orange-badge').remove();
            _.each(headers, function(row, index) {
                var tag = $('<div class="badge orange-badge">' + row + '</div>').on('click', function() {
                    cursor.push({
                        type: 'field',
                        subtype: 'circular',
                        text: row,
                        col: index
                    });
                    Client.modified = true;
                    Client.render();
                });

                $('#tagcloud').append(tag);
            });

            _.defer(function() {
                preview_table.updateSettings({
                    colHeaders: headers,
                    columns: colSettings
                });
            });
        },
        //Convert to DOM creation instead of string concat //TODO
        statementToHTML: function(statement) {
            if (statement === null) {
                console.error('blank statement');
            }

            var container = $('<span>');
            var dom;

            var handler = function(s) {
                return function() {
                    cursor = s;
                };
            };

            var blurHandler = function(element) {
                return function(e) {
                    var value = e.target.value;

                    if (element.type == 'field') {

                        element.text = value;

                        if (_.contains(rawHeader, value) || element.subtype === 'circular') {

                            element.col = _.indexOf(rawHeader, value);
                            $(e.target).removeClass('alizarin');
                            $(e.target).addClass('emerald');
                        } else {

                            element.col = null;

                            $(e.target).addClass('alizarin');
                            $(e.target).removeClass('emerald');
                        }
                    } else if (element.type == 'constant') {

                        element.value = value;

                    }

                    Client.resizeInput(e);
                };
            };

            //Process all elements
            for (var i = 0; i < statement.length; i++) {
                element = statement[i];

                if (element.type == 'condition') {

                    var ifLabel = $('<span class="alizarin hover">if</span>').click(handler(element['if']));
                    var thenLabel = $('<span class="alizarin hover">then</span>').click(handler(element['then']));
                    var elseLabel = $('<span class="alizarin hover">else</span>').click(handler(element['else']));

                    //This is necessary. Don't ask me why.
                    var _if = element['if'];
                    var then = element['then'];
                    var _else = element['else'];

                    $('<div class="nested">')
                        .append(ifLabel)
                        .append(Client.statementToHTML(_if))
                        .append('<br>')
                        .append(thenLabel)
                        .append(Client.statementToHTML(then))
                        .append('<br>')
                        .append(elseLabel)
                        .append(Client.statementToHTML(_else))
                        .appendTo(container);

                } else if (element.type == 'nest') {

                } else if (element.type == 'field') {

                    if (element.subtype === 'rownumber') {
                        container.append('<span class="alizarin"> ' + element.text + '&nbsp;</span>');
                    } else {
                        // Border Color
                        if (element.text === undefined) {
                            dom = $('<input type="text" class="map-input alizarin" value="" autofocus autocomplete="off">');
                        } else if (_.contains(rawHeader, element.text)) {
                            dom = $('<input type="text" class="map-input emerald" value="' + element.text + '" autocomplete="off">');
                        } else {
                            dom = $('<input type="text" class="map-input alizarin" value="' + element.text + '" autocomplete="off">');
                        }

                        dom.blur(blurHandler(element));
                        container.append(dom);
                    }

                } else if (element.type == 'constant') {
                    if (element.value === undefined) {
                        dom = $('<input type="text" autofocus class="map-input sunflower" autocomplete="off" value="">');
                    } else {
                        dom = $('<input type="text" class="map-input sunflower" autocomplete="off" value="' + element.value + '">');
                    }

                    dom.blur(blurHandler(element));
                    container.append(dom);

                } else if (element.type == 'operator' || element.type == 'unit' || element.type == 'lookup' || element.type == 'transform') {
                    container.append('<span class="alizarin"> ' + element.text + '&nbsp;</span>');
                }
            }

            return container;
        },

        save: function() {
            $.ajax({
                url: "json/save.json",
                data: {
                    "data": table.getData()
                },
                dataType: 'json',
                type: 'POST',
                success: function(res) {
                    if (res.result === 'ok') {
                        console.log('Data saved');
                    } else {
                        console.log('Save error');
                    }
                },
                error: function() {
                    $console.text('Save error. POST method is not allowed on GitHub Pages. Run this example on your own server to see the success message.');
                }
            });
        },
        load: function() {
            $.ajax({
                url: "json/load.json",
                dataType: 'json',
                type: 'GET',
                success: function(res) {
                    table.loadData(res.data);
                    console.log('Data loaded');
                }
            });
        },
        resizeInput: function(e) {
            $(e.target).attr('size', $(e.target).val().length);
        },
        isAPIAvailable: function() {
            // Check for the various File API support.
            if (window.File && window.FileReader && window.FileList && window.Blob) {
                // Great success! All the File APIs are supported.
                return true;
            } else {
                return false;
            }
        }
    };

    Template.section0.events = {
        'click .goto1': function() {
            Client.goto(1);
        }
    };

    Template.section1.files = function() {
        return Datafiles.find({
            owner: Meteor.userId()
        }, {
            sort: {
                uploadDate: 1
            }
        });
    };

    Template.section1.selectedDataFile = function() {
        var s = Datafiles.findOne(Session.get('datafile'));
        return s ? s.filename : '';
    };

    Template.section1.events = {
        'click .use-datafile': function() {
            Session.set('datafile', this._id);

            Datafiles.retrieveBlob(this._id, function(file) {
                var reader = new FileReader();
                reader.onload = function(event) {
                    var csv = event.target.result;
                    Client.processCSV(csv);
                };

                if (file.blob) {
                    reader.readAsText(file.blob, 'ISO-8859-1');
                } else {
                    reader.readAsText(file.file, 'ISO-8859-1');
                }

                var output = '';
                output += '<span style="font-weight:bold;">' + escape(file.filename) + '</span><br />\n';
                output += ' - FileType: ' + (file.contentType || 'n/a') + '<br />\n';
                output += ' - FileSize: ' + file.length + ' bytes<br />\n';

                Session.set('metadata', output);
                Client.goto(2);
            });
        },
        'click .delete-datafile': function() {
            var choice = confirm('Deleted files cannot be recovered. Do you want to proceed?');

            if (choice) {
                Datafiles.remove(this._id);
            }
        },
        'change #files': function(evt) {
            var files = evt.target.files;
            var file = files[0];

            customerName = prompt('Customer Name');

            if (customerName === null) {
                customerName = '';
            }

            Datafiles.storeFile(file, {
                customer: customerName,
                owner: Meteor.userId()
            });

            // read the file metadata
            var output = '';
            output += '<span style="font-weight:bold;">' + escape(file.name) + '</span><br />\n';
            output += ' - FileType: ' + (file.type || 'n/a') + '<br />\n';
            output += ' - FileSize: ' + file.size + ' bytes<br />\n';
            output += ' - LastModified: ' + (file.lastModifiedDate ? file.lastModifiedDate.toLocaleDateString() : 'n/a') + '<br />\n';

            // post the results
            Session.set('metadata', output);
        }
    };

    //May change to static CSS
    Template.section1.rendered = function() {
        //Style
        $('section').css('min-height', $(window).height() / 5 * 4);
        $('section').css('margin-top', $(window).height() / 5);
    };
    Template.section2.rendered = function() {
        //Style
        $('section').css('min-height', $(window).height() / 5 * 4);
        $('section').css('margin-top', $(window).height() / 5);
    };
    Template.section3.rendered = function() {
        //Style
        $('section').css('min-height', $(window).height() / 5 * 4);
        $('section').css('margin-top', $(window).height() / 5);
    };

    Template.section2.list = function() {
        return Schemas.find({
            owner: Meteor.userId()
        });
    };

    Template.section2.dev = function() {
        return Session.get('dev');
    };

    Template.section2.selectedSchema = function() {
        var s = Schemas.findOne(Session.get('schema'));
        return s ? s.schema : '';
    };

    Template.section2.events = {
        'click .use-schema': function() {
            Session.set('schema', this._id);

            try {
                goal = JSONfn.parse(this.goal);

                current = goal[0];
                cursor = current.statement;

                Client.updateGoal(goal);

                Client.goto(3);
                Client.render();
            } catch (err) {
                console.error(err);
            }
        },
        'click .delete-schema': function() {
            var choice = confirm('Deleted files cannot be recovered. Do you want to proceed?');

            if (choice) {
                Schemas.remove(this._id);
            }
        },
        'click .download-schema': function() {

            $('.download-schema').attr('href', "data:text/json;charset=utf-8, " + escape(this.goal));
        },
        'click .new-schema': function() {

            var schema = prompt('Schema Name');
            if (schema == null) return;

            var goal = [];

            _.each(rawHeader.reverse(), function(header, index) {
                goal.push({
                    header: header,
                    statement: [{
                        "type": "field",
                        "text": header,
                        "col": index,
                        "id": "F363_1"
                    }],
                    validation: {
                        allowBlank: null,
                        fixedLength: null,
                        maxValue: null,
                        minValue: null,
                        type: null,
                        pattern: null,
                        dictionary: null,
                        date: null
                    },
                    rules: null
                });
            });

            if (schema) {
                Schemas.insert({
                    schema: schema,
                    goal: JSONfn.stringify(goal),
                    owner: Meteor.userId()
                });
            }
        }
    };

    Template.section3.events = {
        'click .add-column': function() {
            var pages = $('#paging').bootstrapPaginator("getPages");
            var index = pages.current;

            var adjustStatement = function(statement) {
                _.each(statement, function(element) {
                    if (element.subtype === 'circular') {
                        if (element.col >= index) {
                            element.col += 1;
                        }
                    }

                    if (element.type == "condition") {
                        adjustStatement(element['if']);
                        adjustStatement(element['then']);
                        adjustStatement(element['else']);
                    } else if (element.type == "nest") {
                        adjustStatement(element['child']);
                    }
                });
            };

            title = prompt("What is the new column title?");


            goal.splice(index, 0, {
                header: title,
                statement: [],
                validation: {
                    allowBlank: null,
                    fixedLength: null,
                    maxValue: null,
                    minValue: null,
                    type: null,
                    pattern: null,
                    dictionary: null,
                    date: null
                },
                rules: null
            });

            //Adjust references
            _.each(goal, function(g, index, list) {
                adjustStatement(g.statement);
            });

            current = goal[index];
            cursor = current.statement;
            Client.render();
            Client.modified = true;
            Client.updateGoal(goal);
        },
        'click .edit-column': function() {
            var pages = $('#paging').bootstrapPaginator("getPages");
            var index = pages.current - 1;

            current = goal[index];

            current.header = prompt('New Column Name');

            if (current.header == null) return;

            cursor = current.statement;
            Client.render();
            Client.modified = true;
            Client.updateGoal(goal);
        },
        'click .delete-column': function() {
            var pages = $('#paging').bootstrapPaginator("getPages");
            var index = pages.current - 1;

            var adjustStatement = function(statement) {
                _.each(statement, function(element) {
                    if (element.subtype === 'circular') {
                        if (element.col == index) {
                            //Bad reference
                            element.col = -1;
                            console.log('Bad reference');
                        } else if (element.col > index) {
                            element.col -= 1;
                        }
                    }

                    if (element.type == "condition") {
                        adjustStatement(element['if']);
                        adjustStatement(element['then']);
                        adjustStatement(element['else']);
                    } else if (element.type == "nest") {
                        adjustStatement(element['child']);
                    }
                });
            };

            //Remove from Goal
            goal.splice(index, 1);

            var options = {
                currentPage: pages.current == pages.last ? pages.current - 1 : pages.current,
                totalPages: goal.length
            };

            //Adjust references
            _.each(goal, function(g, index, list) {
                console.log("Adjust references: ", g.statement);
                adjustStatement(g.statement);
            });

            //Remove from Pages
            $('#paging').bootstrapPaginator(options);

            if (options.currentPage > 0) {
                current = goal[options.currentPage - 1];
            } else {
                current = goal[options.currentPage];
            }

            cursor = current.statement;
            Client.render();
            Client.modified = true;
            Client.updateGoal(goal);
        }
    };

    Template.section3.metadata = function() {
        return Handlebars.SafeString(Session.get('metadata'));
    };

    Template.toolbox.events = {
        'click a.add': function(e) {
            var key = e.target.name;

            if (key === undefined || key === '') {
                console.error('add operator has error. name is undefined');
                return;
            }

            Client.add(key);
        },

        'click .delete': function() {
            cursor.pop();
            Client.modified = true;
            Client.render();
        },

        'blur #target-date-format': function(e) {
            current.validation.targetDateFormat = $('#target-date-format').val();
        },

        'blur #source-date-format': function(e) {
            DATE_FORMAT = current.validation.sourceDateFormat = $('#source-date-format').val();
        }
    };

    Template.preview.firstPage = function() {
        return Session.get('resultPage') > 0;
    };

    Template.preview.events = {
        'click .next': function() {

            var page = Session.get('resultPage');
            Session.set('resultPage', page + 1);

            _.defer(function() {
                var jobID = Random.id();

                Meteor.call('crunchData', csvData, JSONfn.stringify(goal), jobID, false, page + 1, function(error, result) {
                    preview_table.loadData(result.valid);
                    $('.preview-valid').text("Preview valid rows");
                });

                var interval = setInterval(function() {
                    var job = Status.findOne(jobID);
                    var percentageComplete = Math.floor(job.processed / job.total * 100);

                    if (percentageComplete == 100) {
                        clearInterval(interval);
                    } else {
                        $('.preview-valid').text(percentageComplete + "% complete");
                    }
                }, 500);
            });
        },
        'click .prev': function() {

            var page = Session.get('resultPage');

            if (page === 0) {
                return;
            }

            Session.set('resultPage', page - 1);

            _.defer(function() {
                var jobID = Random.id();
                Meteor.call('crunchData', csvData, JSONfn.stringify(goal), jobID, false, page - 1, function(error, result) {
                    preview_table.loadData(result.valid);
                    $('.preview-valid').text("Preview valid rows");
                });

                var interval = setInterval(function() {
                    var job = Status.findOne(jobID);
                    var percentageComplete = Math.floor(job.processed / job.total * 100);

                    if (percentageComplete == 100) {
                        clearInterval(interval);
                    } else {
                        $('.preview-valid').text(percentageComplete + "% complete");
                    }
                }, 500);
            });
        }
    };

    Template.mapping.events = {
        'click .collapse-validation': function() {
            $('#validation').slideToggle();
        },
        'click .preview-valid': function(evt) {
            var that = $(evt.target);

            that.text("loading…");

            _.defer(function() {
                var jobID = Random.id();
                Meteor.call('crunchData', csvData, JSONfn.stringify(goal), jobID, false, 0, function(error, result) {
                    Session.set('result', result.valid);
                    Session.set('resultPage', 0);

                    $('#error-count').empty();
                    $('#error-box').empty();

                    that.text("Preview valid rows");
                    preview_table.loadData(result.valid.slice(0, 25));
                });

                var interval = setInterval(function() {
                    var job = Status.findOne(jobID);
                    var percentageComplete = Math.floor(job.processed / job.total * 100);

                    if (percentageComplete == 100) {
                        clearInterval(interval);
                    } else {
                        that.text(percentageComplete + "% complete");
                    }
                }, 500);
            });
        },

        'click .process-all': function(evt) {
            var that = $(evt.target);
            that.text("loading…");

            _.defer(function() {
                var jobID = Random.id();
                Meteor.call('crunchData', csvData, JSONfn.stringify(goal), jobID, true, function(error, result) {
                    var headers = _.pluck(goal, 'header');
                    result.valid.unshift(headers);

                    that.attr('href', "data:text/csv;charset=utf-8, " + escape($.csv.fromArrays(result.valid)));
                    that.text("Download Cleaned Data as CSV");
                    that.removeClass('btn-primary').addClass('btn-success').attr('download', 'compiled.csv');
                });

                var interval = setInterval(function() {
                    var job = Status.findOne(jobID);
                    var percentageComplete = Math.floor(job.processed / job.total * 100);

                    if (percentageComplete == 100) {
                        clearInterval(interval);
                    } else {
                        that.text(percentageComplete + "% complete");
                    }
                }, 500);
            });
        },

        'click .preview': function(evt) {
            var that = $(evt.target);
            that.text("loading…");

            _.defer(function() {
                var jobID = Random.id();
                Meteor.call('crunchData', csvData, JSONfn.stringify(goal), jobID, false, function(error, result) {
                    Session.set('result', result.invalid);
                    Session.set('resultPage', 0);
                    if (result.invalid.length > 0) {
                        $('#error-box').empty();

                        console.log(result.errors);
                        _.each(result.errors, function(err) {
                            $('#error-box').append(err + '<br>');
                        });

                        that.text("Preview invalid rows");
                        $('#error-count').text(result.invalid.length + ' rows are invalid. Please correct the errors');

                        preview_table.loadData(result.invalid.slice(0, 25));
                    } else {
                        $('#error-box').empty();
                        $('#error-count').empty().text('There are no errors');
                        that.text("Preview invalid rows");
                        preview_table.loadData([]);
                    }
                });

                var interval = setInterval(function() {
                    var job = Status.findOne(jobID);
                    var percentageComplete = Math.floor(job.processed / job.total * 100);

                    if (percentageComplete == 100) {
                        clearInterval(interval);
                    } else {
                        that.text(percentageComplete + "% complete");
                    }
                }, 500);


            });
        },

        'click .save-config': function(e) {
            Schemas.update(Session.get('schema'), {
                $set: {
                    goal: JSONfn.stringify(goal)
                }
            });

            $(e.target).toggleClass('btn-primary btn-success').text('Saved!');

            setTimeout(function() {
                $(e.target).toggleClass('btn-primary btn-success').text('Save');
            }, 2000);

            Client.modified = false;
        },

        'click .save-config-new': function(e) {

            var schema = prompt('Schema Name');

            if (schema) {
                Schemas.insert({
                    schema: schema,
                    goal: JSONfn.stringify(goal),
                    owner: Meteor.userId()
                });
            }

            $(e.target).toggleClass('btn-primary btn-success').text('Saved!');
            setTimeout(function() {
                $(e.target).toggleClass('btn-primary btn-success').text('Save as');
            }, 2000);

            Client.modified = false;
        }
    };

    Meteor.startup(function() {

        var filterArray = [];

        var $container_invalid = $('#preview');

        $container_invalid.handsontable({
            minSpareRows: 0,
            rowHeaders: true,
            contextMenu: true,
            colWidths: "120px",
            manualColumnResize: true,
            afterLoadData: function() {
                var that = this;
                that.validateCells(function() {
                    that.render();
                });
            }
        });

        preview_table = $container_invalid.data('handsontable');

        //Check for files API in browser
        if (Client.isAPIAvailable()) {
            $('#sample').bind('change', handleSampleFileSelect);

            $('#template').bind('change', handleTemplateSelect);
        }

        function handleSampleFileSelect(evt) {
            var files = evt.target.files;
            var file = files[0];

            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function(event) {

                //Convert data into 2D array
                var csv = event.target.result;
                var csvSample = $.csv2Array(csv);
                var headers = csvSample.shift();

                var g = _.map(headers, function(col) {
                    return {
                        header: col,
                        statement: [],
                        validation: {
                            allowBlank: null,
                            fixedLength: null,
                            maxValue: null,
                            minValue: null,
                            type: null,
                            pattern: null,
                            dictionary: null,
                            date: null
                        },
                        rules: null
                    };
                });

                console.table(g);

                //Reduce sample data to rules
                var gg = _.reduce(csvSample, function(memo, row, index) {
                    var value;
                    //Loop col
                    for (var i = 0; i < row.length; i++) {
                        value = row[i];

                        //Type check
                        if (index === 0) {
                            memo[i].validation.type = 'string';

                            if (value.match(/^[A-Z]+$/)) {
                                memo[i].validation.pattern = "^[A-Z]+$"; //All Uppercase
                            } else if (value.match(/^[a-zA-Z]+$/)) {
                                memo[i].validation.pattern = "^[a-zA-Z]+$";
                            } else if (value.match(/^[a-zA-Z0-9]+$/)) { //Alpha Numeric
                                memo[i].validation.pattern = "^[a-zA-Z0-9]+$";
                            } else if (Client.isNumber(value)) {
                                memo[i].validation.type = 'number';
                            } else if (value.match(/^(0?[1-9]|1[012])[- \/.](0?[1-9]|[12][0-9]|3[01])[- \/.](19|20)?[0-9]{2}$/)) {
                                memo[i].validation.type = 'date';
                                memo[i].validation.pattern = _DATE_REGEXP;
                            }
                        }

                        if (index === 0 && memo[i].validation.type == 'string') {
                            memo[i].validation.dictionary = [];
                        }

                        //Check blank
                        if (value === null || value === '' || value === undefined) {
                            memo[i].validation.allowBlank = true;
                        }

                        //Check fixed Length
                        if (index === 0) {
                            memo[i].validation.fixedLength = value.length;
                        } else if (memo[i].validation.fixedLength !== null && memo[i].validation.fixedLength != value.length) {
                            memo[i].validation.fixedLength = null;
                        }

                        if (memo[i].validation.type == 'string') {
                            if (!_.contains(memo[i].validation.dictionary, value)) {
                                memo[i].validation.dictionary.push(value);
                            }
                        }

                        //Check Max Value
                        if (index === 0 && Client.isNumber(value)) {
                            memo[i].validation.maxValue = parseFloat(value);
                        } else if (memo[i].validation.maxValue !== null && memo[i].validation.maxValue < parseFloat(value)) {
                            memo[i].validation.maxValue = parseFloat(value);
                        }

                        //Check Min Value
                        if (index === 0 && Client.isNumber(value)) {
                            memo[i].validation.minValue = parseFloat(value);
                        } else if (memo[i].validation.minValue !== null && memo[i].validation.minValue > parseFloat(value)) {
                            memo[i].validation.minValue = parseFloat(value);
                        }
                    }

                    return memo;
                }, g);

                //Clean up step
                goal = _.map(gg, function(col) {
                    if (col.validation.dictionary !== null && col.validation.dictionary.length > 8) {
                        col.validation.dictionary = null;
                    }

                    return col;
                });

                Client.saveGoal(goal);
            };
        }

        function handleTemplateSelect(evt) {
            var files = evt.target.files;
            var file = files[0];

            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = function(event) {
                var text = event.target.result;

                try {
                    goal = JSONfn.parse(text);

                    Client.saveGoal(goal);
                } catch (err) {
                    console.error(err);
                }
            };
        }

        //Initialize data binding for the validation definition form
        (function() {
            var val = $('#validation');

            val.find('[name=allowBlank]').on('change', function() {
                if ($(this).prop('checked')) {
                    current.validation.allowBlank = true;
                } else {
                    current.validation.allowBlank = false;
                }
                Client.render();
            });

            val.find('[name=type]').on('change', function() {
                if ($(this).prop('checked')) {
                    current.validation.type = $(this).val();
                }

                Client.render();
            });

            val.find('[name=hasFixedLength]').on('change', function() {
                if ($(this).prop('checked')) {
                    current.validation.fixedLength = 10;
                } else {
                    current.validation.fixedLength = null;
                }
                Client.render();
            });

            val.find('[name=hasMaxValue]').on('change', function() {
                if ($(this).prop('checked')) {
                    current.validation.maxValue = 10;
                } else {
                    current.validation.maxValue = null;
                }
                Client.render();
            });

            val.find('[name=hasMinValue]').on('change', function() {
                if ($(this).prop('checked')) {
                    current.validation.minValue = 0;
                } else {
                    current.validation.minValue = null;
                }
                Client.render();
            });

            val.find('[name=hasPattern]').on('change', function() {
                if ($(this).prop('checked')) {
                    current.validation.pattern = '';
                } else {
                    current.validation.pattern = null;
                }
                Client.render();
            });

            val.find('[name=hasDictionary]').on('change', function() {
                if ($(this).prop('checked')) {
                    current.validation.dictionary = [];
                } else {
                    current.validation.dictionary = null;
                }
                Client.render();
            });

            val.find('[name=hasExcludeDictionary]').on('change', function() {
                if ($(this).prop('checked')) {
                    current.validation.excludeDictionary = [];
                } else {
                    current.validation.excludeDictionary = null;
                }
                Client.render();
            });

            val.find('[name=fixedLength]').on('change', function() {
                current.validation.fixedLength = $(this).val();
            });

            val.find('[name=maxValue]').on('change', function() {
                current.validation.maxValue = $(this).val();
            });

            val.find('[name=minValue]').on('change', function() {
                current.validation.minValue = $(this).val();
            });
            val.find('[name=pattern]').on('change', function() {
                current.validation.pattern = $(this).val();
            });
            val.find('[name=dictionary]').on('change', function() {
                current.validation.dictionary = $(this).val().split('\n');
            });
            val.find('[name=excludeDictionary]').on('change', function() {
                current.validation.excludeDictionary = $(this).val().split('\n');
            });
        })();


        window.onbeforeunload = function(e) {
            if (Client.modified) {
                var message = "You have not saved the changes made to the Schema. Are you sure you want to exit?",
                    e = e || window.event;
                // For IE and Firefox
                if (e) {
                    e.returnValue = message;
                }

                // For Safari
                return message;
            }
        };
    });
}

if (Meteor.isServer) {
    var API = {
        google: 'AIzaSyBOJAnw6BiKa0nCRQEj5WS7oILiJDxZ2gY'
    };

    Server = _.extend(Server, {
        isNumber: function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        },

        crunchData: function(raw, schema, jobID, crunchAll, offset) {
            schema = JSONfn.parse(schema);

            var result = {
                valid: [],
                invalid: [],
                errors: [],
                summary: {
                    average: [],
                    count: [],
                    sum: []
                }
            };

            var job = {
                _id: jobID,
                total: (crunchAll) ? raw.length : _.min([25, raw.length]),
                processed: 0
            };

            Status.insert(job);

            _.each(raw[0], function(col, index) {
                result.summary.count[index] = 0;
                result.summary.sum[index] = 0;
            });

            result.summary = _.reduce(raw, function(memo, row) {
                _.each(row, function(cell, index) {
                    if (Server.isNumber(cell)) {
                        memo.count[index]++;
                        memo.sum[index] += parseFloat(cell);
                    }
                });

                return memo;
            }, result.summary);

            _.each(result.summary.count, function(value, index) {
                if (value > 0) {
                    result.summary.average[index] = result.summary.sum[index] / value;
                }
            });

            if (crunchAll === false) {
                raw = raw.splice(offset * 25, 25);
            }

            _.each(raw, function(row, rindex) {
                var isValid = true;
                var computedRow = [];

                _.each(schema, function(col, cindex) {
                    var value = Meteor.call('compute', col.statement, row, computedRow, col.validation, result.summary, rindex);
                    if (value && value._isAMomentObject && col.validation.targetDateFormat) {
                        value = value.format(col.validation.targetDateFormat);
                    }

                    var error = Meteor.call('validate', value, col.validation, rindex + 1);

                    if (error) {
                        isValid = false;
                        result.errors.push(error);
                    }

                    computedRow.push(value);
                });

                if (isValid) {
                    result.valid.push(computedRow);
                } else {
                    result.invalid.push(computedRow);
                }

                Status.update(jobID, {
                    $inc: {
                        processed: 1
                    }
                });
            });

            //Pipe output into database;

            // if (getValid) {
            //     return result.valid.slice(0, 25);
            // } else {
            //     return result.invalid.slice(0, 25), result.errors;
            // }

            return result;
        },

        compute: function(statement, data, computedRow, validation, summary, rindex) {
            var holder = null;
            var operator = null;
            var element = null;

            var _lookup = function(value) {
                return value;
            };

            var lookup = _lookup;

            var cond, result, value;

            statement = _.clone(statement);

            //Process all elements
            while (statement.length > 0) {
                // reverse stack
                element = statement.shift();
                if (element.type == 'condition') {
                    cond = Meteor.call('compute', element['if'], data, computedRow, validation, summary, rindex);

                    if (typeof cond == 'boolean') {
                        if (cond) {
                            result = Meteor.call('compute', element['then'], data, computedRow, validation, summary, rindex);
                            return result;
                        } else {
                            result = Meteor.call('compute', element['else'], data, computedRow, validation, summary, rindex);
                            return result;
                        }
                    } else {

                        console.error('Invalid if condition');

                    }

                } else if (element.type == 'nest') {
                    result = Meteor.call('compute', element.child, data, computedRow, validation, summary, rindex);

                    if (holder === null && operator === null) {
                        holder = result;
                    } else if (holder !== null && operator !== null) {
                        holder = operator(holder, result);
                        operator = null;
                    } else {
                        console.error('invalid statement');
                    }

                } else if (element.type == 'field' || element.type == 'constant') {
                    // try to parse data

                    if (element.type == 'field') {
                        //Try to prevent circulars
                        if (element.subtype === 'circular') {
                            value = computedRow[element.col];
                        } else if (element.subtype === 'rindex') {
                            value = rindex + 1;
                        } else {
                            value = data[element.col];
                        }
                    } else if (element.type == 'constant') {
                        value = element.value;
                    }

                    if (typeof value == 'string') {
                        value = value.trim();

                        if (Server.isNumber(value)) {
                            value = parseFloat(value);
                            //Try to find a unit
                            if (statement.length > 0 && statement[0].type == 'unit') {
                                console.log('a wild unit appeared');
                                value = statement[0].fn(value);

                                statement.shift();
                            }
                        } else if (validation.sourceDateFormat) {
                            if (moment(value, validation.sourceDateFormat).isValid()) {
                                value = moment(value, validation.sourceDateFormat);
                            } else {
                                console.log('invalid date format', validation.sourceDateFormat, value);
                            }
                        }
                    }

                    if (holder === null) {
                        if (operator === null) {
                            holder = lookup(value, element.col, summary);
                            lookup = _lookup;
                        } else {
                            console.error('invalid statement');
                        }
                    } else {
                        if (operator !== null) {
                            holder = operator(holder, lookup(value, element.col, summary));
                            lookup = _lookup;
                            operator = null;
                        } else {
                            console.error('invalid statement');
                        }
                    }
                } else if (element.type == 'operator') {
                    if (holder === null) {
                        console.error('invalid statement', 'missing holder element');
                    } else if (operator !== null) {
                        console.error('invalid statement', 'consecutive operator');
                    } else {
                        operator = element.fn;
                    }

                } else if (element.type == 'transform') {
                    if (holder === null) {
                        console.error('invalid statement', 'missing holder element');
                    } else if (operator !== null) {
                        console.error('invalid statement', 'consecutive operator');
                    } else {
                        holder = element.fn(holder);
                    }
                } else if (element.type == 'lookup') {
                    lookup = element.fn;
                }
            }

            //No more elements
            return holder;
        },

        validate: function(data, validation, rindex) {
            var isBlank;

            if (data === '' || data === undefined || data === null) {
                isBlank = true;
            }

            if (validation.allowBlank === false && isBlank) {
                return 'Blank cell found at row ' + rindex;
            } else if (validation.allowBlank === true && isBlank) {
                return;
            } else if (validation.fixedLength !== null && data.length != validation.fixedLength) {
                return 'Value Length Violation at row ' + rindex;
            } else if (validation.pattern !== null && typeof data == 'string' && !data.match(new RegExp(validation.pattern))) {
                return 'Data Pattern Violation at row ' + rindex;
            } else if (validation.type !== null) {
                //TODO
                return;
                // } else if (validation.targetDateFormat && !moment(validation.targetDateFormat, data).isValid()) {
                // return;
            } else if (validation.maxValue !== null && parseFloat(data) > validation.maxValue) {
                return 'Data Range Violation at row ' + rindex;
            } else if (validation.minValue !== null && parseFloat(data) < validation.minValue) {
                return 'Data Range Violation at row ' + rindex;
            } else if (validation.dictionary !== null && !_.contains(validation.dictionary, data)) {
                return 'Whitelist Violation at row ' + rindex;
            } else if (validation.excludeDictionary !== null && _.contains(validation.excludeDictionary, data)) {
                return 'Blacklist Violation at row ' + rindex;
            } else {
                return;
            }
        }
    });

    console.log("=== Server Function List ===");
    for (var k in Server) {
        console.log(k);
    }

    Meteor.methods(Server);

    Meteor.publish("data", function() {
        return [Schemas.find({}), Status.find({})];
    });
}
