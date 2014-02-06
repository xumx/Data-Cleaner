var Schemas = new Meteor.Collection('schema');
var Datafiles = new CollectionFS('datafile');

var _DATE_REGEXP = '^(19|20)\\d\\d([- /.])(0[1-9]|1[012])\\2(0[1-9]|[12][0-9]|3[01])$';

var Core = {
	prepareData: function(raw, schema) {
		var result = {
			valid: [],
			invalid: [],
			errors: []
		}

		_.each(raw, function(row, rindex) {
			var isValid = true;
			var computedRow = [];

			_.each(schema, function(col, cindex) {
				var value = Core.compute(col.statement, row, computedRow);

				Core.validate(value, col.validation, function(error) {

					if (error) {
						isValid = false;
						result.errors.push(error);
					}

					computedRow.push(value);
				}, rindex);
			});

			if (isValid) {
				result.valid.push(computedRow);
			} else {
				result.invalid.push(computedRow);
			}
		});

		return result;
	},

	compute: function(originalStatement, data, computedRow) {
		if (originalStatement == null) return '';

		var statement = $.extend(true, [], originalStatement);

		var holder = null;
		var operator = null;
		var element = null;
		
		var _lookup = function (value) {
			return value;
		}

		var lookup = _lookup;

		var cond, result, value;

		//Process all elements
		while (statement.length > 0) {
			// reverse stack
			element = statement.shift();

			if (element.type == 'condition') {
				cond = Core.compute(element['if'], data);

				if (typeof cond == 'boolean') {
					if (cond) {
						result = Core.compute(element['then'], data);
						return result;
					} else {
						result = Core.compute(element['else'], data);
						return result;
					}
				} else {

					console.error('Invalid if condition');

				}

			} else if (element.type == 'nest') {
				result = Core.compute(element.child, data);

				if (holder == null && operator == null) {
					holder = result;
				} else if (holder != null && operator != null) {
					holder = operator(holder, result);
					operator = null;
				} else {
					console.error('invalid statement');
				}

			} else if (element.type == 'field') {
				// try to parse data

				if (element.circular) {
					//Try to prevent circulars
					value = computedRow[element.col];
				} else {
					value = data[element.col];
				}


				if (typeof value == 'string') {
					value = value.trim();

					if (utility.isNumber(value)) {
						value = parseFloat(value);
					}
				}

				if (holder == null) {
					if (operator == null) {
						holder = lookup(value, element.col);
						lookup = _lookup;
					} else {
						console.error('invalid statement');
					}
				} else {
					if (operator != null) {
						holder = operator(holder, lookup(value, element.col));
						lookup = _lookup;
						operator = null;
					} else {
						console.error('invalid statement');
					}
				}

			} else if (element.type == 'constant') {
				if (typeof element.value == 'string' && utility.isNumber(element.value)) {
					element.value = parseFloat(element.value);
				}

				if (holder == null && operator == null) {
					holder = element.value
				} else if (holder != null && operator != null) {
					holder = operator(holder, element.value);
					operator = null;
				} else {
					console.error('invalid statement');
				}

			} else if (element.type == 'operator') {
				if (holder == null) {
					console.error('invalid statement', 'missing holder element');
				} else if (operator != null) {
					console.error('invalid statement', 'consecutive operator');
				} else {
					operator = element.fn;
				}

			} else if (element.type == 'transform') {
				if (holder == null) {
					console.error('invalid statement', 'missing holder element');
				} else if (operator != null) {
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

	validate: function(data, validation, callback, rindex) {
		var isBlank;

		if (data == '' || data == undefined || data == null) {
			isBlank = true;
		}

		if (validation.allowBlank === false && isBlank) {
			callback('Blank cell found at row ' + rindex);
		} else if (validation.allowBlank === true && isBlank) {
			callback();
		} else if (validation.fixedLength != null && data.length != validation.fixedLength) {
			callback('Value Length Violation at row ' + rindex);
		} else if (validation.pattern != null && !data.match(new RegExp(validation.pattern))) {
			callback('Data Pattern Violation at row ' + rindex);
		} else if (validation.type != null) {
			//Is Date
			if (validation.type == 'number') {
				if (typeof data == 'number') {
					callback();	
				} else {
					callback('Data type mismatch - Expects number but receives' + typeof data);
				}
			}

			if (validation.type == 'string') {
				callback();
			}

			if (validation.type == 'date' && data.match(new RegExp(_DATE_REGEXP))) {
				callback();
			} else {
				callback('Data type mismatch');	
			}

		} else if (validation.maxValue != null && parseFloat(data) > validation.maxValue) {
			callback('Data Range Violation at row ' + rindex);
		} else if (validation.minValue != null && parseFloat(data) < validation.minValue) {
			callback('Data Range Violation at row ' + rindex);
		} else if (validation.dictionary != null && !_.contains(validation.dictionary, data)) {
			callback('Dictionary Violation at row ' + rindex);
		} else {
			callback();
		}
	},
}

if (Meteor.isClient) {
	var JSONfn;
	if (!JSONfn) {
		JSONfn = {};
	}

	(function() {
		JSONfn.stringify = function(obj) {
			return JSON.stringify(obj, function(key, value) {
				return (typeof value === 'function') ? value.toString() : value;
			});
		}

		JSONfn.parse = function(str) {
			return JSON.parse(str, function(key, value) {
				if (typeof value != 'string') return value;
				return (value.substring(0, 8) == 'function') ? eval('(' + value + ')') : value;
			});
		}
	}());

	var rawHeader, goal, dataSummary, current, csvData, valid_table, invalid_table, cursor,
	sessionKey = _.random(100, 999);

	Operators = {
		plus: {
			type: 'operator',
			text: '+',
			fn: function(a, b) {
				return a + b;
			}
		},
		minus: {
			type: 'operator',
			text: '-',
			fn: function(a, b) {
				return a - b;
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
						
						array = _.map(array, function (n) {
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
		blank: {
			type: 'transform',
			text: 'is blank',
			fn: function (a) {
				var isBlank = false;

				isBlank = isBlank || a == undefined || a == null;

				if (typeof a == 'string') {
					isBlank = isBlank || a.match(/^\s*$/) != null;
				}

				return isBlank;
			}
		},
		contain: {
			type: 'operator',
			text: 'contains',
			fn: function (a, b) {
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
			fn: function (value, column) {
				return dataSummary.average[column];
			}
		},{
			type: 'field'
		}],
		total: {
			type: 'lookup',
			text: '\'s total value',
			fn: function (value, column) {
				return dataSummary.sum[column];
			}
		},
		extract: [{
			type:'field'
		},{
			type: 'operator',
			text: '\'s numeric value at position',
			fn: function (a, b) {
				try {
					b = parseInt(b);

					var match = a.match(/(\d+(\.\d+)?)/g);
					if (match) {
						return match[b-1];
					} else {
						return ''
					}
				} catch (e) {
					return '';
				}
			}
		},{
			type:'constant'
		}],
		count: [{
			type: 'constant'
		},{
			type: 'operator',
			text: '\'s number of occurance in',
			fn: function () {
				var match = b.match(a);
				if (match) {
					return match.length;
				} else {
					return ''
				}
			}
		}, {
			type: 'field'
		}],
		replace: [{
			type: 'operator',
			text: 'replace all',
			fn: function (source, pattern) {
				var re = new RegExp(pattern, 'g');
				return source.replace(re,'___');
			}
		}, 
		{
			type:'constant'
		}, 
		{
			type: 'operator',
			text: 'with',
			fn: function (source, target) {
				return source.replace(/___/g, target);
			}
		},
		{
			type:'constant'
		}],
		field: {
			type: 'field'
		},
		constant: {
			type: 'constant',
		},
		condition: function () {
			return {
				type: 'condition',
				'if': [],
				'then': [],
				'else': []
			};
		}
	}

	var utility = {
		isNumber: function(n) {
			return !isNaN(parseFloat(n)) && isFinite(n);
		},
		goto: function (number) {
			$('html,body').animate({
				scrollTop: $('#section' + number).position().top
			}, 500);
		},
		add: function (key) {
			var op = Operators[key];
			
			if (op instanceof Array) {
				for (var i = 0; i < op.length; i++) {
					cursor.push(_.clone(op[i]));
				}
			} else if (typeof op == 'function'){
				cursor.push(op());
			} else {
				cursor.push(_.clone(op))
			}

			utility.render();
		},
		get: function(id, statement) {

			for (var i = 0; i < statement.length; i++) {
				if (statement[i].id == id) {
					return statement[i];
				} else if (statement[i].type == 'condition') {
					return utility.get(id, statement[i]['if']) || utility.get(id, statement[i]['then']) || utility.get(id, statement[i]['else']);
				}
			}

			return false;
		},

		processCSV: function(csv) {
			//Convert data into 2D array
			csvData = $.csv2Array(csv);
			rawHeader = csvData.shift();
			
			dataSummary = {
				average: [],
				count: [],
				sum: []
			}

			_.each(rawHeader, function (row, index) {
				dataSummary.count[index] = 0;
				dataSummary.sum[index] = 0;
			});

			dataSummary = _.reduce(csvData, function (memo, row) {
				_.each(row, function (cell, index) {
					
					if (utility.isNumber(cell)) {
						memo.count[index]++;
						memo.sum[index] += parseFloat(cell);
					}

				});

				return memo;
			}, dataSummary);

			_.each(dataSummary.count, function (value,index) {
				if (value > 0) {
					dataSummary.average[index] = dataSummary.sum[index] / value;
				}
			});

			console.log(dataSummary);

			_.defer(function () {
				_.each(rawHeader, function(row, index) {
					var tag = $('<div class="badge badge-info">' + row + '</div>').on('click', function() {
						cursor.push({
							type: 'field',
							text: row,
							col: index,
							id: _.uniqueId('F' + sessionKey + '_')
						});

						utility.render();
					});

					$('#tagcloud').append(tag);
				});	
			})	
		},

		render: function() {
			$('.map').empty();
			$('.goal').text(current.header).click(function() {
				cursor = current.statement;
			});
			$('.map').append($(utility.statementToHTML(current.statement)));

			//Binding
			var val = $('#validation');

			if (current.validation.allowBlank) {
				val.find('[name=allowBlank]').attr('checked', true);
			} else {
				val.find('[name=allowBlank]').attr('checked', false);
			}

			if (current.validation.type != null) {
				val.find('[name=type][value=' + current.validation.type + ']').attr('checked', true);
			} else {
				val.find('[name=type]').attr('checked', false);
			}

			if (current.validation.fixedLength != null) {
				val.find('[name=hasFixedLength]').attr('checked', true);
				val.find('[name=fixedLength]').val(current.validation.fixedLength).show();
			} else {
				val.find('[name=hasFixedLength]').attr('checked', false);
				val.find('[name=fixedLength]').val(null).hide();
			}


			if (current.validation.maxValue != null) {
				val.find('[name=hasMaxValue]').attr('checked', true);
				val.find('[name=maxValue]').val(current.validation.maxValue).show();
			} else {
				val.find('[name=hasMaxValue]').attr('checked', false);
				val.find('[name=maxValue]').val(null).hide();
			}


			if (current.validation.minValue != null) {
				val.find('[name=hasMinValue]').attr('checked', true);
				val.find('[name=minValue]').val(current.validation.minValue).show();
			} else {
				val.find('[name=hasMinValue]').attr('checked', false);
				val.find('[name=minValue]').val(current.validation.minValue).hide();
			}


			if (current.validation.pattern != null) {
				val.find('[name=hasPattern]').attr('checked', true);
				val.find('[name=pattern]').val(current.validation.pattern).show();
			} else {
				val.find('[name=hasPattern]').attr('checked', false);
				val.find('[name=pattern]').val(null).hide();
			}


			if (current.validation.dictionary != null) {
				val.find('[name=hasDictionary]').attr('checked', true);
				val.find('[name=dictionary]').val(current.validation.dictionary.join('\n')).show();
			} else {
				val.find('[name=hasDictionary]').attr('checked', false);
				val.find('[name=dictionary]').val('').hide();
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
		prepareGoal: function(goal) {
			current = goal[0];
			cursor = current.statement;

			var pagingOptions = {
				currentPage: 1,
				totalPages: goal.length,
				numberOfPages: 10,
				size: 'large',
				alignment: 'center',
				onPageClicked: function(e, originalEvent, type, page) {
					var index = page - 1;
					current = goal[index];
					cursor = current.statement;
					utility.render();
				}
			}

			$('#paging').bootstrapPaginator(pagingOptions);

			var colSettings = _.map(goal, function(g) {
				var validator = function(value, callback) {
					Core.validate(value, g.validation, function(error) {
						if (error) {
							callback(false);
						} else {
							callback(true);
						}
					})
				}

				return {
					validator: validator,
					allowInvalid: true
				}
			});

			var headers = _.pluck(goal, 'header');

			invalid_table.updateSettings({
				colHeaders: headers,
				columns: colSettings
			});

			_.defer(function () {
				_.each(headers, function(row, index) {
					var tag = $('<div class="badge" style="background-color:orange;">' + row + '</div>').on('click', function() {
						cursor.push({
							type: 'field',
							text: row,
							col: index,
							id: _.uniqueId('G' + sessionKey + '_'),
							circular:true
						});

						utility.render();
					});

					$('#tagcloud').append(tag);
				});	
			})	
		},

		//Convert to DOM creation instead of string concat //TODO
		statementToHTML: function(statement) {
			if (statement == null) {
				console.error('blank statement');
			}

			var container = $('<span>')
			var dom;

			var handler = function(s) {
				return function() {
					cursor = s;
				}
			}

			var blurHandler = function (element) {
				return function (e) {
					var value = e.target.value;

					if (element.type == 'field') {

						element.text = value;

						if (_.contains(rawHeader, value) || element.circular) {

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

					utility.resizeInput(e)
				}
			}

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
					.append(utility.statementToHTML(_if))
					.append('<br>')
					.append(thenLabel)
					.append(utility.statementToHTML(then))
					.append('<br>')
					.append(elseLabel)
					.append(utility.statementToHTML(_else))
					.appendTo(container);

				} else if (element.type == 'nest') {

				} else if (element.type == 'field') {
					

					// Border Color
					if (element.text === undefined) {
						dom = $('<input type="text" class="map-input alizarin" value="" autofocus autocomplete="off">')
					} else if (_.contains(rawHeader, element.text)) {
						dom = $('<input type="text" class="map-input emerald" value="' + element.text + '" autocomplete="off">');
					} else {
						dom = $('<input type="text" class="map-input alizarin" value="' + element.text + '" autocomplete="off">');
					}

					dom.blur(blurHandler(element));
					container.append(dom);

				} else if (element.type == 'constant') {
					if (element.value === undefined) {
						dom = $('<input type="text" autofocus class="map-input sunflower" autocomplete="off" value="">');
					} else {
						dom = $('<input type="text" class="map-input sunflower" autocomplete="off" value="' + element.value + '">');
					}
					
					dom.blur(blurHandler(element));
					container.append(dom);
					
				} else if (element.type == 'operator' || element.type == 'lookup' || element.type == 'transform') {
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
				// source: File API availability - http://caniuse.com/#feat=fileapi
				// source: <output> availability - http://html5doctor.com/the-output-element/
				document.writeln('The HTML5 APIs used in this form are only available in the following browsers:<br />');
				// 6.0 File API & 13.0 <output>
				document.writeln(' - Google Chrome: 13.0 or later<br />');
				// 3.6 File API & 6.0 <output>
				document.writeln(' - Mozilla Firefox: 6.0 or later<br />');
				// 10.0 File API & 10.0 <output>
				document.writeln(' - Internet Explorer: Not supported (partial support expected in 10.0)<br />');
				// ? File API & 5.1 <output>
				document.writeln(' - Safari: Not supported<br />');
				// ? File API & 9.2 <output>
				document.writeln(' - Opera: Not supported');
				return false;
			}
		}
	}

	
	Template.section0.events = {
		'click .goto1': function () {
			utility.goto(1);
		}
	}

	Template.section1.files = function () {
		return Datafiles.find({
			owner: Meteor.userId()
		}, { sort: { uploadDate:-1 } });
	}

	Template.section1.selectedDataFile = function () {
		var s = Datafiles.findOne(Session.get('datafile'));
		return s ? s.filename : '';
	}

	Template.section1.events = {
		'click .use-datafile': function () {
			Session.set('datafile',this._id);

			Datafiles.retrieveBlob(this._id, function (file) {
				var reader = new FileReader();
				reader.onload = function(event){
					var csv = event.target.result;
					utility.processCSV(csv);
				};

				if (file.blob) {
					reader.readAsText(file.blob);
				} else {
					reader.readAsText(file.file);
				}

				var output = ''
				output += '<span style="font-weight:bold;">' + escape(file.filename) + '</span><br />\n';
				output += ' - FileType: ' + (file.contentType || 'n/a') + '<br />\n';
				output += ' - FileSize: ' + file.length + ' bytes<br />\n';

				Session.set('metadata', output);
				utility.goto(2);
			});
		},
		'click .delete-datafile':function () {
			Datafiles.remove(this._id);
		},
		'change #files': function (evt) {
			var files = evt.target.files;
			var file = files[0];

			customerName = prompt('Customer Name');

			Datafiles.storeFile(file, {
				customer: customerName,
				owner: Meteor.userId()
			});

			// read the file metadata
			var output = ''
			output += '<span style="font-weight:bold;">' + escape(file.name) + '</span><br />\n';
			output += ' - FileType: ' + (file.type || 'n/a') + '<br />\n';
			output += ' - FileSize: ' + file.size + ' bytes<br />\n';
			output += ' - LastModified: ' + (file.lastModifiedDate ? file.lastModifiedDate.toLocaleDateString() : 'n/a') + '<br />\n';			

			// post the results
			Session.set('metadata', output);


			// Read the file contents
			var reader = new FileReader();
			reader.readAsText(file);
			reader.onload = function(event) {
				var csv = event.target.result;
				utility.processCSV(csv);
			};

			reader.onerror = function() {
				alert('Unable to read ' + file.fileName);
			};
		}
	}

	//May change to static CSS
	Template.section1.rendered = function () {
		//Style
		$('section').css('min-height',$(window).height()/5*4);
		$('section').css('margin-top',$(window).height()/5);
	}
	Template.section2.rendered = function () {
		//Style
		$('section').css('min-height',$(window).height()/5*4);
		$('section').css('margin-top',$(window).height()/5);
	}
	Template.section3.rendered = function () {
		//Style
		$('section').css('min-height',$(window).height()/5*4);
		$('section').css('margin-top',$(window).height()/5);
	}

	Template.section2.list = function() {
		return Schemas.find({
			owner: Meteor.userId()
		});
	}

	Template.section2.dev = function () {
		return Session.get('dev');
	}

	Template.section2.selectedSchema = function() {
		var s = Schemas.findOne(Session.get('schema'));
		return s ? s.schema : '';
	}

	Template.section2.events = {
		'click .use-schema': function() {
			Session.set('schema', this._id);

			try {
				goal = JSONfn.parse(this.goal);
				utility.prepareGoal(goal);

				utility.goto(3);
				utility.render();
			} catch (err) {
				console.error(err);
			}
		},
		'click .delete-schema': function() {
			Schemas.remove(this._id);
		}
	}

	Template.section3.metadata = function () {
		return Handlebars.SafeString(Session.get('metadata'));
	}

	Template.toolbox.events = {
		'click a.add': function (e) {
			var key = e.target.name;

			if (key === undefined || key === '') {
				console.error('add operator has error. name is undefined')
				return;
			}

			utility.add(key);
		},

		'click .delete': function() {
			cursor.pop();
			utility.render();
		},

		'click .desired-date-format': function (e) {
			$('#desired-date-format').text('Target: ' + e.target.text);
		},

		'click .source-date-format': function (e) {
			$('#source-date-format').text('Source: ' + e.target.text);
		}
	}

	Template.mapping.events = {
		
		'click .preview-valid': function (evt) {
			var that = $(evt.target);

			that.text("loading…");
			
			_.defer(function() {
				that.text("Preview cleaned results");

				var data = Core.prepareData(csvData, goal);
				invalid_table.loadData(data.valid.slice(0, 50));

				
				$('#error-count').empty();
				$('#error-box').empty();
				$('.download-csv').attr('href', "data:text/csv;charset=utf-8, " + escape($.csv.fromArrays(data.valid)));
			});
		},
		'click .preview': function(evt) {
			var that = $(evt.target);
			that.text("loading…");

			_.defer(function() {

				var data = Core.prepareData(csvData, goal);

				invalid_table.loadData(data.invalid.slice(0, 50));

				$('#error-box').empty();
				_.each(data.errors, function(error) {
					$('#error-box').append(error + '<br>');
				});

				that.text("Preview");

				if (data.invalid.length > 0) {
					$('#error-count').text(data.invalid.length+ '/' + (data.valid.length + data.invalid.length) + ' rows are invalid. Please correct the errors.')
				} else {
					$('#error-count').empty();
				}

				$('.download-csv').attr('href', "data:text/csv;charset=utf-8, " + escape($.csv.fromArrays(data.valid)));
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
		},

		'click .save-config-new': function (e) {

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
		},

		'click .download-config': function() {

			$('.download-config').attr('href', "data:text/json;charset=utf-8, " + escape(JSONfn.stringify(goal)));
		}
	}

	Meteor.startup(function() {

		

		var filterArray = [];

		var $container_invalid = $('#preview');

		$container_invalid.handsontable({
			minSpareRows: 0,
			rowHeaders: true,
			contextMenu: true,
			afterLoadData: function() {
				var that = this;
				that.validateCells(function() {
					that.render();
				});
			}
		});

		invalid_table = $container_invalid.data('handsontable');

		//Check for files API in browser
		if (utility.isAPIAvailable()) {
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
							dictionary: null
						},
						rules: null
					}
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
							} else if (utility.isNumber(value)) {
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
						} else if (memo[i].validation.fixedLength != null && memo[i].validation.fixedLength != value.length) {
							memo[i].validation.fixedLength = null;
						}

						if (memo[i].validation.type == 'string') {
							if (!_.contains(memo[i].validation.dictionary, value)) {
								memo[i].validation.dictionary.push(value);
							}
						}

						//Check Max Value
						if (index === 0 && utility.isNumber(value)) {
							memo[i].validation.maxValue = parseFloat(value);;
						} else if (memo[i].validation.maxValue != null && memo[i].validation.maxValue < parseFloat(value)) {
							memo[i].validation.maxValue = parseFloat(value);
						}

						//Check Min Value
						if (index === 0 && utility.isNumber(value)) {
							memo[i].validation.minValue = parseFloat(value);;
						} else if (memo[i].validation.minValue != null && memo[i].validation.minValue > parseFloat(value)) {
							memo[i].validation.minValue = parseFloat(value);
						}
					}

					return memo;
				}, g);

				//Clean up step
				goal = _.map(gg, function(col) {
					if (col.validation.dictionary != null && col.validation.dictionary.length > 8) {
						col.validation.dictionary = null;
					}

					if (col.validation.allowBlank == null) {
						col.validation.allowBlank = false;
					}

					return col;
				});

				utility.saveGoal(goal);
			}
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

					utility.saveGoal(goal);
				} catch (err) {
					console.error(err);
				}
			}
		}

		//Initialize data binding for the validation definition form
		(function() {
			var val = $('#validation');

			val.find('[name=allowBlank]').change(function() {
				if ($(this).attr('checked')) {
					current.validation.allowBlank = true;
				} else {
					current.validation.allowBlank = false;
				}
				utility.render();
			});

			val.find('[name=type]').change(function() {
				if ($(this).attr('checked')) {
					current.validation.type = $(this).val();
				}

				utility.render();
			});

			val.find('[name=hasFixedLength]').change(function() {
				if ($(this).attr('checked')) {
					current.validation.fixedLength = 10;
				} else {
					current.validation.fixedLength = null;
				}
				utility.render();
			});

			val.find('[name=hasMaxValue]').change(function() {
				if ($(this).attr('checked')) {
					current.validation.maxValue = 10;
				} else {
					current.validation.maxValue = null;
				}
				utility.render();
			});

			val.find('[name=hasMinValue]').change(function() {
				if ($(this).attr('checked')) {
					current.validation.minValue = 0;
				} else {
					current.validation.minValue = null;
				}
				utility.render();
			});

			val.find('[name=hasPattern]').change(function() {
				if ($(this).attr('checked')) {
					current.validation.pattern = '';
				} else {
					current.validation.pattern = null;
				}
				utility.render();
			});

			val.find('[name=hasDictionary]').change(function() {
				if ($(this).attr('checked')) {
					current.validation.dictionary = [];
				} else {
					current.validation.dictionary = null;
				}
				utility.render();
			});

			val.find('[name=fixedLength]').change(function() {
				current.validation.fixedLength = $(this).val();
			});

			val.find('[name=maxValue]').change(function() {
				current.validation.maxValue = $(this).val();
			});

			val.find('[name=minValue]').change(function() {
				current.validation.minValue = $(this).val();
			});
			val.find('[name=pattern]').change(function() {
				current.validation.pattern = $(this).val();
			});
			val.find('[name=dictionary]').change(function() {
				current.validation.dictionary = $(this).val().split('\n');
			});
		})()
	});
}

if (Meteor.isServer) {
}