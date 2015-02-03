Ext.define('CrossWorkspaceReleaseBurndownApp', {
	extend : 'Rally.app.App',
	componentCls : 'app',

	requires : [ 'CrossWorkspaceBurndownCalculator', 'Deft.Deferred', 'Ext.form.field.ComboBox', 'Rally.data.wsapi.Store' ],

	launch : function() {
		Deft.Chain.pipeline([ this.getWorkspaceCollection, this.getReleasesInWorkspaces, this.filterLikeReleases, this.createFilteredCombobox ], this);
	},

	getWorkspaceCollection : function() {
		var deferred = Ext.create('Deft.Deferred');

		Ext.create('Rally.data.wsapi.Store', {
			model : 'Subscription',
			fetch : [ 'Workspaces' ],
			autoLoad : true,
			listeners : {
				load : function(store, data) {
					var subscription = data[0];

					subscription.getCollection('Workspaces').load({
						fetch : [ 'ObjectID', 'Name', 'State' ],
						filters : [ {
							property : 'State',
							operator : '!=',
							value : 'Closed'
						} ],
						callback : function(records) {
							deferred.resolve(records);
						}
					});
				}
			}
		});

		return deferred.promise;
	},

	getReleasesInWorkspaces : function(workspaces) {
		return Deft.Chain.parallel(_.map(workspaces, function(workspace) {
			return function() {
				var store = Ext.create('Rally.data.wsapi.Store', {
					model : 'Release',
					fetch : true,
					limit : Infinity,
					context : {
						workspace : Rally.util.Ref.getRelativeUri(workspace),
						project : null
					}
				});

				return store.load();
			};
		}));
	},

	filterLikeReleases : function(aggregateRecords) {
		var deferred = Ext.create('Deft.Deferred'), allReleases = _.pluck(_.flatten(aggregateRecords), 'data'), releases = [], me = this;

		_.map(allReleases, function(release) {
			var likeRelease = me._isLikeReleaseInList(releases, release.Name);

			if (likeRelease) {
				likeRelease.ObjectID.push(release.ObjectID);
				if (!me._isLikeReleaseWorkspaceInList(likeRelease.Workspace, release.Workspace._refObjectName)) {
					likeRelease.Workspace.push(release.Workspace);
				}

			} else {
				var formattedStartDate = Rally.util.DateTime.formatWithDefault(release.ReleaseStartDate);

				var shiftedEndDate = Rally.util.DateTime.shiftTimezoneOffDate(release.ReleaseDate);
				var formattedEndDate = Rally.util.DateTime.formatWithDefault(shiftedEndDate);

				releases.push({
					Name : release.Name,
					ObjectID : [ release.ObjectID ],
					Workspace : [ release.Workspace ],
					ReleaseStartDate : release.ReleaseStartDate,
					ReleaseDate : release.ReleaseDate,
					FormattedReleaseStartDate : formattedStartDate,
					FormattedReleaseDate : formattedEndDate

				});
			}
		});

		releases = _.sortBy(releases, 'Name');
		deferred.resolve(releases);

		return deferred.promise;
	},

	createFilteredCombobox : function(filteredReleases) {
		var sharedReleases = [];
		// TODO: should we allow it to be a setting
		_.each(filteredReleases, function(release){
			if(release.Workspace.length>1){
				sharedReleases.push(release);
			}
		});
		
		this.add({
			xtype : 'combobox',
			fieldLabel : 'Choose Release',
			store : Ext.create('Ext.data.Store', {
				data : sharedReleases,
				fields : [ 'Name', 'ObjectID', 'Workspace', 'FormattedReleaseStartDate', 'FormattedReleaseDate', 'ReleaseStartDate', 'ReleaseDate' ]
			}),
			displayField : 'Name',
			valueField : 'ObjectId',
			width : 600,
			listeners : {
				select : function(combo, record) {
					// var data = record[0].getData();
					var release = record[0].data;
					debugger;
				}
			},
			listConfig : {
				itemTpl : new Ext.XTemplate('<div class="release-name">{Name} &nbsp; &ndash; &nbsp; </div>'
						+ '<div class="workspace-names">( <tpl for="Workspace">{_refObjectName} </tpl>)</div>'
						+ '<div class="release-dates">{FormattedReleaseStartDate} &nbsp; &ndash; &nbsp; {FormattedReleaseDate}</div>'),
				shadow : 'drop'
			}
		});
	},

	_getFilters : function(release) {

		var releaseFilter = Ext.create('Rally.data.lookback.QueryFilter', {
			property : 'Release',
			operator : 'in',
			value : release.ObjectID
		});

		var typeHierarchyFilter = Ext.create('Rally.data.lookback.QueryFilter', {
			property : '_TypeHierarchy',
			operator : '=',
			value : 'HierarchicalRequirement'
		});

		var childrenFilter = Ext.create('Rally.data.lookback.QueryFilter', {
			property : 'Children',
			operator : '=',
			value : null
		});
		// return releaseFilter.and(typeHierarchyFilter);
		return releaseFilter.and(typeHierarchyFilter).and(childrenFilter);

	},
	/**
	 * Generate the store config to retrieve all snapshots for all leaf child
	 * stories
	 */
	_getStoreConfig : function(myFilters) {
		console.log("myFilters: ", myFilters, myFilters.toObject());
		console.log("context: ", this.getContext().getDataContext());

		return {
			filters : myFilters,
			fetch : [ 'ScheduleState', 'PlanEstimate' ],
			hydrate : [ 'ScheduleState' ],
			context : this.getContext().getDataContext(),
			compress : true,
			useHttpPost : true,
			autotload : true,
			limit : Infinity
		};
	},

	_createChart : function(release) {
		console.log("creating chart");
		var me = this;
		var forecastVelocityStartDate;
		var chartEndDate;
		var userChartEndDate;

		var myFilters = me._getFilters(release);

		if (me.forecastChart) {
			// remove old chart before recreating it
			me.remove("forecastChart");
		}

		forecastVelocityStartDate = this.getSetting('forecastVelocityStartDate');
		if (forecastVelocityStartDate) {
			forecastVelocityStartDate = this.dateStringToObject(forecastVelocityStartDate);
		}

		userChartEndDate = this.getSetting('chartEndDate');
		if (userChartEndDate) {
			userChartEndDate = this.dateStringToObject(userChartEndDate);
		}

		chartEndDate = userChartEndDate ? userChartEndDate : release.ReleaseDate;

		me.forecastChart = Ext.create('Rally.ui.chart.Chart', {
			itemId : 'forecastChart', // we'll use this item ID later to get
			// the users' selection
			storeType : 'Rally.data.lookback.SnapshotStore',
			storeConfig : me._getStoreConfig(myFilters),
			calculatorType : 'Rally.example.BurnCalculator',
			calculatorConfig : {
				timeZone : "GMT",
				completedScheduleStateNames : [ 'Accepted' ],
				enableProjections : true,
				startDate : release.ReleaseStartDate,
				scopeEndDate : chartEndDate,
				dailyVelocity : this.dailyVelocity,
				forecastVelocityStartDate : forecastVelocityStartDate
			},
			chartColors : [ "#005eb8", "#8dc63f", "#666666", "#c0c0c0", "#FA58F4" ],
			chartConfig : me._getChartConfig()
		});
		me.add(me.forecastChart);

	},
	/**
	 * Generate a valid Highcharts configuration object to specify the chart
	 */
	_getChartConfig : function() {
		return {
			chart : {
				defaultSeriesType : 'area',
				zoomType : 'xy'
			},
			title : {
				text : 'Wind River Burnup and Forecast',
				margin : 30
			},
			xAxis : {
				categories : [],
				tickmarkPlacement : 'on',
				tickInterval : 7,
				title : {
					text : 'Date',
					margin : 12
				},
				maxPadding : 0.25,
				labels : {
					x : 0,
					y : 20,
					overflow : "justify"
				}
			},
			yAxis : [ {
				title : {
					text : 'Points'
				}
			} ],
			tooltip : {
				formatter : function() {
					return '' + this.x + '<br />' + this.series.name + ': ' + this.y;
				}
			},
			plotOptions : {
				series : {
					marker : {
						enabled : false,
						states : {
							hover : {
								enabled : true
							}
						}
					},
					connectNulls : true
				},
				column : {
					pointPadding : 0,
					borderWidth : 0,
					stacking : null,
					shadow : false
				}
			}
		};
	},

	_isLikeReleaseInList : function(releases, releaseName) {
		return _.find(releases, function(release) {
			return release.Name === releaseName;
		});
	},
	_isLikeReleaseWorkspaceInList : function(workspaces, workspaceName) {
		return _.find(workspaces, function(workspace) {
			return workspace._refObjectName === workspaceName;
		});
	}
});
