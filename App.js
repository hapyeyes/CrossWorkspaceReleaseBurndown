Ext.define('CrossWorkspaceReleaseBurndownApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    requires: [
        'Deft.Deferred',
        'CrossWorkspaceReleaseBurndownCalculator'
    ],

    launch: function() {
        Deft.Chain.pipeline([
            this.getWorkspaceCollection,
            this.createReleaseComboBoxes
        ], this);
    },

    getWorkspaceCollection: function() {
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store', {
            model: 'Subscription',
            fetch: true,
            autoLoad: true,
            listeners: {
                load: function (store, data) {
                    var subscription = data[0];

                    subscription.getCollection('Workspaces').load({
                        fetch: ['ObjectID', 'Name', 'State'],
                        callback: function (records) {
                            var openWorkspaces = _.filter(records, function(record) {
                                return record.get('State') !== 'Closed';
                            });

                            deferred.resolve(openWorkspaces);
                        }
                    });
                }
            }
        });

        return deferred.promise;
    },

    createReleaseComboBoxes: function(workspaces) {
        var me = this;

        return Deft.Promise.all(_.map(workspaces, function(workspace) {
            return function () {
                var deferred = Ext.create('Deft.Deferred');
                me.add({
                    xtype: 'rallyreleasecombobox',
                    fieldLabel: workspace.get('Name'),
                    storeConfig: {
                        context: {
                            workspace: Rally.util.Ref.getRelativeUri(workspace),
                            project: null, // make project picker listen to this?
                            projectScopeUp: false,
                            projectScopeDown: false
                        }
                    },
                    listeners: {
                        ready: function() {
                            deferred.resolve();
                        }
                    },
                    scope: me
                });

                return deferred.promise;
            }();
        }));
    }
});
