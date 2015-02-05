Ext.define('CrossWorkspaceBurndownCalculator', {
	extend : 'Rally.data.lookback.calculator.TimeSeriesCalculator',
	config : {
		completedScheduleStateNames : [ 'Accepted' ]
	},
	constructor : function(config) {
		this.initConfig(config);
		this.callParent(arguments);
	},

	getDerivedFieldsOnInput : function() {
		var me = this;
		var completedScheduleStateNames = this.getCompletedScheduleStateNames();
		var workspacePoints;
		var workspace;
		
		var data = [ {
			"as" : "AcceptedPoints",
			"f" : function(snapshot) {
				debugger;

				var ss = snapshot.ScheduleState;
				if (completedScheduleStateNames.indexOf(ss) > -1) {
					if (snapshot.PlanEstimate) {
						return snapshot.PlanEstimate;
					}
				}

				return 0;
			}
		}, {
			// Sum of Planned Estimate for all states
			"as" : "TotalBacklog",
			"f" : function(snapshot) {
				if (snapshot.PlanEstimate) {
					return snapshot.PlanEstimate;
				}
				return 0;
			}
		} ];

		for ( var i in me.selectedRelease.Workspace) {
			workspace = me.selectedRelease.Workspace[i];
			workspacePoints = [ {
				"as" : workspace._refObjectName + " Accepted points",
				"f" : function(snapshot) {
					debugger;
					var ss = snapshot.ScheduleState;
					if (snapshot.workspace === workspace._ref) {
						if (completedScheduleStateNames.indexOf(ss) > -1) {
							if (snapshot.PlanEstimate) {
								return snapshot.PlanEstimate;
							}
						}
					}
					return 0;
				}
			}, {
				"as" : workspace._refObjectName + " Total Backlog",
				"f" : function(snapshot) {
					if (snapshot.workspace === workspace._ref) {
						if (snapshot.PlanEstimate) {
							return snapshot.PlanEstimate;
						}
					}
					return 0;
				}
			} ];

			data = data.concat(workspacePoints);
		}
		debugger;

		return data;
	},

	getMetrics : function() {
		var me = this;
		var workspaceMetrics;
		var workspace;
		
		var metrics = [ {
			"field" : "AcceptedPoints",
			"as" : "Accepted",
			"f" : "sum",
			"display" : "line"
		}, {
			"field" : "TotalBacklog",
			"as" : "Total Backlog",
			"f" : "sum",
			"display" : "line"
		} ];
		for ( var i in me.selectedRelease.Workspace) {
			workspace = me.selectedRelease.Workspace[i];
			workspaceMetrics = [ {
				"field" : workspace._refObjectName + " AcceptedPoints",
				"as" : workspace._refObjectName + " Accepted",
				"f" : "sum",
				"display" : "line"
			}, {
				"field" : workspace._refObjectName + " TotalBacklog",
				"as" : workspace._refObjectName + " Total Backlog",
				"f" : "sum",
				"display" : "line"
			} ];
			metrics = metrics.concat(workspaceMetrics);
		}
		return metrics;
	},

	getDerivedFieldsAfterSummary : function() {
		return [ {
			"as" : "Accepted Prediction",
			"f" : function(row, index, summaryMetrics, seriesData) {
				return null;
			},
			"display" : "line",
			"dashStyle" : "Dash"
		}, {
			"as" : "Total Backlog Prediction",
			"f" : function(row, index, summaryMetrics, seriesData) {
				return null;
			},
			"display" : "line",
			"dashStyle" : "Dash"
		}, {
			"as" : "Forecast Velocity",
			"f" : function(row, index, summaryMetrics, seriesData) {
				return null;
			},
			"display" : "line",
			"dashStyle" : "Dash"
		} ];
	},

	getProjectionsConfig : function() {
		var days = (this.scopeEndDate.getTime() - Rally.util.DateTime.fromIsoString(this.startDate).getTime()) / (24 * 1000 * 60 * 60);
		var doubleTimeboxEnd = Ext.Date.add(Rally.util.DateTime.fromIsoString(this.startDate), Ext.Date.DAY, (Math.floor(days) * 2) - 1);
		var timeboxEnd = Ext.Date.add(this.scopeEndDate, Ext.Date.DAY, -1);
		if (this.projectionsConfig === undefined) {
			this.projectionsConfig = {
				doubleTimeboxEnd : doubleTimeboxEnd,
				timeboxEnd : timeboxEnd,

				series : [ {
					"as" : "Accepted Prediction",
					"field" : "Accepted"
				}, {
					"as" : "Total Backlog Prediction",
					"field" : "Total Backlog",
					"slope" : 0
				} ],
				continueWhile : function(point) {
					var dt = Rally.util.DateTime.fromIsoString(point.tick);
					var end = (this.series[0].slope >= 0) ? this.timeboxEnd : this.doubleTimeboxEnd;
					return dt < end;

				}
			};
		}
		return this.projectionsConfig;
	},

	_firstNonZero : function(data) {
		var i;
		for (i = 0; i < data.length; i++) {
			if (data[i] > 0) {
				return i;
			}
		}
		return 0;
	},

	// Had to overwrite to allow more than one store
	/**
	 * The entry point to a calculator instance. Prepares the data from the
	 * store to be passed along to Lumenize. You should override this function
	 * if you require extra functionality beyond collecting store data in an
	 * array to pass to #runCalculation. This function is responsible for
	 * returning the data as an object with categories to display and a
	 * Highcharts series. For example, { "series": [...], "categories": ["Line
	 * 1", "Column 1", "Line 2"] }
	 * 
	 * @param store
	 *            the data store
	 * @return {Object} highcharts series and categories
	 */
	prepareChartData : function(store) {
		var snapshots = [];
		var raw;
		console.log(store);
		for ( var i in store) {
			store[i].each(function(record) {
				raw = record.raw;
				raw.workspace = store[i].context.workspace;
				snapshots.push(raw);
			});
		}
		return this.runCalculation(snapshots);
	},

	runCalculation : function(snapshots) {
		debugger;
		var chartData = this.callParent(arguments);
		var forecastVelocityLineIndex = 4;
		var acceptedLineIndex = 0;
		var acceptedData;
		var forecastData;
		var forecastVelocityStartDateStr;
		var i;

		// Calculate the Velocity Forecast Line
		// Take the Accepted Line Index, and add the dailyVelocity to the line
		// this.forecastVelocityStartDate = new Date("2014/07/01");
		console.log("forecastVelocityStartDate", this.forecastVelocityStartDate);
		if (chartData && this.dailyVelocity && this.forecastVelocityStartDate) {
			console.log("runCalculation", this.dailyVelocity);

			forecastVelocityStartDateStr = Ext.Date.format(this.forecastVelocityStartDate, 'Y-m-d');

			acceptedData = chartData.series[acceptedLineIndex].data;
			forecastData = chartData.series[forecastVelocityLineIndex].data;

			var firstIndex = this._indexOfDate(chartData, forecastVelocityStartDateStr);

			if (firstIndex !== -1) {
				forecastData[firstIndex] = acceptedData[firstIndex] + this.dailyVelocity;
				for (i = firstIndex + 1; i < forecastData.length; i++) {
					forecastData[i] = forecastData[i - 1] + this.dailyVelocity;
				}
			}
			chartData.series[forecastVelocityLineIndex].data = forecastData;
		}
		return chartData;
	},

	_indexOfDate : function(chartData, dateStr) {
		var date;
		var index = -1;
		if (dateStr === undefined) {
			return index;
		}

		index = chartData.categories.indexOf(dateStr);
		if (index === -1) {
			var chartDataStartDate = new Date(chartData.categories[0]);
			while (index === -1 && date > chartDataStartDate) {
				date = Ext.Date.add(date, Ext.Date.DAY, -1);
				dateStr = Ext.Date.format(date, 'Y-m-d');
				index = chartData.categories.indexOf(dateStr);
			}
		}
		console.log("index", index);
		return index;
	}
});
