Ext.define('CrossWorkspaceReleaseBurndownApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    requires: [
        'Deft.Deferred',
        'Ext.form.field.ComboBox',
        'Rally.data.wsapi.Store'
    ],

    launch: function() {
        Deft.Chain.pipeline([
            this.getWorkspaceCollection,
            this.getReleasesInWorkspaces,
            this.filterLikeReleases,
            this.createFilteredCombobox
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
        return Deft.Chain.parallel(_.map(workspaces, function(workspace) {
            return function() {
                var store = Ext.create('Rally.data.wsapi.Store', {
                    model: 'Release',
                    fetch: true,
                    context: {
                        workspace: Rally.util.Ref.getRelativeUri(workspace),
                        project: null
                    }
                });

                return store.load();
            };
        }));
    },

    filterLikeReleases: function(aggregateRecords) {
        var deferred = Ext.create('Deft.Deferred'),
            allReleases = _.pluck(_.flatten(aggregateRecords), 'data'),
            releases = [],
            me = this;

        _.map(allReleases, function(release) {
            var likeRelease = me._isLikeReleaseInList(releases, release.Name);

            if (likeRelease) {
                likeRelease.ObjectID.push(release.ObjectID);

                if (!_.isEqual(likeRelease.Workspace, release.Workspace)) {
                    likeRelease.Workspace.push(release.Workspace);
                }
            } else {
                releases.push({
                    Name: release.Name,
                    ObjectID: [release.ObjectID],
                    Workspace: [release.Workspace],
                    ReleaseStartDate: release.ReleaseStartDate,
                    ReleaseDate: release.ReleaseDate
                });
            }
        });

        releases = _.sortBy(releases, 'Name');
        deferred.resolve(releases);

        return deferred.promise;
    },

    createFilteredCombobox: function(filteredReleases) {
        this.add({
            xtype: 'combobox',
            fieldLabel: 'Choose Release',
            store: Ext.create('Ext.data.Store', {
                data: filteredReleases,
                fields: ['Name', 'ObjectID', 'Workspace']
            }),
            displayField: 'Name',
            valueField: 'ObjectId',
            width: 300,
            listeners: {
                select: function(combo, record) {
                    //var data = record[0].getData();
                }
            },
            listConfig: {
                itemTpl: new Ext.XTemplate(
                    '<div class="release-name">{Name} &nbsp; &ndash; &nbsp;</div><div class="workspace-names">(<tpl for="Workspace">{Name}</tpl>)</div>'
                ),
                shadow: 'drop'
            }
        });
    },

    _isLikeReleaseInList: function(releases, releaseName) {
        return _.find(releases, function(release) {
            return release.Name === releaseName
        });
    }
});
