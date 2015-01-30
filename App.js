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
        var allReleases = [];
        var deferred = Ext.create('Deft.Deferred');

        Deft.Promise.all(_.map(workspaces, function(workspace) {
            return function() {
                Ext.create('Rally.data.wsapi.Store', {
                    model: 'Release',
                    fetch: true,
                    autoLoad: true,
                    context: {
                        workspace: Rally.util.Ref.getRelativeUri(workspace),
                        project: null
                    },
                    listeners: {
                        load: function (store, data) {
                            allReleases = allReleases.concat(data);
                            if (workspaces.indexOf(workspace) === workspaces.length - 1) {
                                deferred.resolve(allReleases);
                            }
                        }
                    }
                });
            }();
        }));

        return deferred.promise;
    },

    createReleasePicker: function(releases) {
        var deferred = Ext.create('Deft.Deferred');

        this.add({
            xtype: 'rallymultiobjectpicker',
            fieldLabel: 'Choose Releases',
            modelTypes: ['Release'],
            store: Ext.create('Rally.data.custom.Store', {
                data: releases
            }),
            storeConfig: {
                context: {
                    workspace: null,
                    project: null
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
