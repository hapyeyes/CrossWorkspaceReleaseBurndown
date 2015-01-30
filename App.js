Ext.define('CrossWorkspaceReleaseBurndownApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    requires: [
        'Deft.Deferred',
        'Rally.data.wsapi.Store',
        'Rally.ui.picker.MultiObjectPicker',
        'CrossWorkspaceReleaseBurndownCalculator'
    ],

    launch: function() {
        Deft.Chain.pipeline([
            this.createFilteredReleaseStore,
            this.createFilteredReleasePicker
            //this.createReleasePicker

        ], this);
    },

    //getWorkspaceCollection: function() {
    //    var deferred = Ext.create('Deft.Deferred');
    //
    //    Ext.create('Rally.data.wsapi.Store', {
    //        model: 'Subscription',
    //        fetch: ['Workspaces'],
    //        autoLoad: true,
    //        listeners: {
    //            load: function (store, data) {
    //                var subscription = data[0];
    //
    //                subscription.getCollection('Workspaces').load({
    //                    fetch: ['ObjectID', 'Name', 'State'],
    //                    filters: [
    //                        {
    //                            property: 'State',
    //                            operator: '!=',
    //                            value: 'Closed'
    //                        }
    //                    ],
    //                    callback: function(records) {
    //                        deferred.resolve(records);
    //                    }
    //                });
    //            }
    //        }
    //    });
    //
    //    return deferred.promise;
    //},
    //
    //getReleasesInWorkspaces: function(workspaces) {
    //    Deft.Chain.parallel(_.map(workspaces, function(workspace) {
    //        return function() {
    //            var deferred = Ext.create('Deft.Deferred');
    //
    //            Ext.create('Rally.data.wsapi.Store', {
    //                model: 'Release',
    //                fetch: true,
    //                autoLoad: true,
    //                context: {
    //                    workspace: Rally.util.Ref.getRelativeUri(workspace),
    //                    project: null
    //                },
    //                listeners: {
    //                    load: function(store, data) {
    //                        deferred.resolve(data);
    //                    }
    //                }
    //            });
    //
    //            return deferred.promise;
    //        };
    //    }));
    //},

    createFilteredReleaseStore: function() {
        var deferred = Ext.create('Deft.Deferred');
        var collapsedReleases = [];

        Ext.create('Rally.data.wsapi.Store', {
            model: 'Release',
            autoLoad: true,
            context: {
                workspace: null,
                project: null
            },
            limit: 200, // super awesome if this damn thing had pagination
            listeners: {
                load: function(store, data) {
                    _.map(data, function(release) {
                        if (collapsedReleases[release.data.Name] === undefined) {
                            collapsedReleases[release.data.Name] = [];
                        }

                        collapsedReleases[release.data.Name].push({
                            ObjectID: release.data.ObjectID,
                            Workspace: release.data.Workspace,
                            ReleaseStartDate: release.data.ReleaseStartDate,
                            ReleaseDate: release.data.ReleaseDate
                        });

                    });

                    deferred.resolve(collapsedReleases);
                }
            }
        });

        return deferred.promise;
    },

    createFilteredReleasePicker: function(filteredReleases) {
        debugger;
        this.add({
            xtype: 'rallygrid',
            showPagingToolbar: false,
            showRowActionsColumn: false,
            editable: false,
            store: Ext.create('Rally.data.custom.Store', {
                data: filteredReleases
            }),
            columnCfgs: [
                {
                    text: 'Name',
                    dataIndex: 'Name',
                    flex: 1
                },
                {
                    text: 'Workspace',
                    dataIndex: 'Workspace'
                },
                {
                    text: 'Release Start Date',
                    dataIndex: 'ReleaseStartDate'
                },
                {
                    text: 'Release End Date',
                    dataIndex: 'ReleaseDate'
                }
            ]
        });

        //this.add({
        //    xtype: 'rallymultiobjectpicker',
        //    modelType: 'Release',
        //    store: Ext.create('Rally.data.custom.Store', {
        //        data: filteredReleases
        //    })
        //});
    },

    createReleasePicker: function(releases) {
        debugger;
        var deferred = Ext.create('Deft.Deferred');
        var collapsedReleases = [];

        this.add({
            xtype: 'rallymultiobjectpicker',
            fieldLabel: 'Choose Releases',
            modelType: 'Release',
            storeConfig: {
                autoLoad: false,
                data: releases,
                context: {
                    workspace: null,
                    project: null
                },
                limit: Infinity, // super awesome if this damn thing had pagination
                listeners: {
                    load: function(store, data) {
                        _.map(data, function(release) {
                            if (collapsedReleases[release.data.Name] === undefined) {
                                collapsedReleases[release.data.Name] = [];
                            }

                            collapsedReleases[release.data.Name].push({
                                ObjectID: release.data.ObjectID,
                                Workspace: release.data.Workspace,
                                ReleaseStartDate: release.data.ReleaseStartDate,
                                ReleaseDate: release.data.ReleaseDate
                            });

                        });

                        debugger;
                    }
                }
            },
            listeners: {
                ready: function () {
                    deferred.resolve();
                },
                select: function(picker, value, values) {
                    // filter values here...
                }
            }
        });

        return deferred.promise;
    }
});
