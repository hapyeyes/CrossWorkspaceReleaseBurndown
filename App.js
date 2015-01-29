Ext.define('CrossWorkspaceReleaseBurndownApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    requires: [
        'Deft.Deferred',
        'CrossWorkspaceReleaseBurndownCalculator'
    ],

    launch: function() {
        Deft.Chain.pipeline([
            this.getWorkspaceOidCollection,
            this.createReleaseComboBoxes
        ], this);
    },

    getWorkspaceOidCollection: function() {
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store', {
            model: 'Workspace',
            fetch: ['ObjectID'],
            autoLoad: true,
            listeners: {
                load: function (store, data) {
                    var workspaceOids = _.map(data, function(record) {
                        return record.get('ObjectID');
                    });

                    deferred.resolve(workspaceOids);
                }
            }
        });

        return deferred.promise;
    },

    createReleaseComboBoxes: function(workspaceOids) {
        var me = this;

        return Deft.Promise.all(_.map(workspaceOids, function(workspace) {
            return function () {
                var deferred = Ext.create('Deft.Deferred');
                me.add({
                    xtype: 'rallyreleasecombobox',
                    context: {
                        workspace: '/workspace/' + workspace
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
