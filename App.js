Ext.define('CrossWorkspaceReleaseBurndownApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    requires: [
        'Deft.Deferred',
        'Rally.data.custom.Store',
        'Rally.data.wsapi.Store',
        'Rally.ui.picker.MultiObjectPicker',
        'CrossWorkspaceReleaseBurndownCalculator'
    ],

    launch: function() {
        Deft.Chain.pipeline([
            this.getWorkspaceCollection,
            this.getReleasesInWorkspaces,
            this.createReleasePicker
        ], this);
    },

    getWorkspaceCollection: function() {
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store', {
            model: 'Subscription',
            fetch: ['Workspaces'],
            autoLoad: true,
            listeners: {
                load: function (store, data) {
                    var subscription = data[0];

                    subscription.getCollection('Workspaces').load({
                        fetch: ['ObjectID', 'Name', 'State'],
                        filters: [
                            {
                                property: 'State',
                                operator: '!=',
                                value: 'Closed'
                            }
                        ],
                        callback: function(records) {
                            deferred.resolve(records);
                        }
                    });
                }
            }
        });

        return deferred.promise;
    },

    getReleasesInWorkspaces: function(workspaces) {
        Deft.Chain.parallel(_.map(workspaces, function(workspace) {
            return function() {
                var deferred = Ext.create('Deft.Deferred');

                Ext.create('Rally.data.wsapi.Store', {
                    model: 'Release',
                    fetch: true,
                    autoLoad: true,
                    context: {
                        workspace: Rally.util.Ref.getRelativeUri(workspace),
                        project: null
                    },
                    listeners: {
                        load: function(store, data) {
                            deferred.resolve(data);
                        }
                    }
                });

                return deferred.promise;
            };
        }));
    },

    createReleasePicker: function(releases) {
        debugger;
        var deferred = Ext.create('Deft.Deferred');

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
                limit: Infinity,
                listeners: {
                    load: function(store, data) {
                        // data loaded...
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
