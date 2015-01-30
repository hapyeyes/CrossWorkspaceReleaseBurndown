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
            this.createFilteredReleaseStore,
            this.createFilteredCombobox
        ], this);
    },

    createFilteredReleaseStore: function() {
        var deferred = Ext.create('Deft.Deferred'),
            releases = [],
            me = this;

        Ext.create('Rally.data.wsapi.Store', {
            model: 'Release',
            autoLoad: true,
            context: {
                workspace: null,
                project: null
            },
            limit: Infinity,
            listeners: {
                load: function(store, data) {
                    _.map(data, function(release) {
                        var rData = release.data;
                        var likeRelease = me._isLikeReleaseInList(releases, rData.Name);

                        if (likeRelease) {
                            likeRelease.ObjectID.push(rData.ObjectID);

                            if (_.isEqual(likeRelease.Workspace, rData.Workspace)) {
                                likeRelease.Workspace.push(rData.Workspace);
                            }
                        } else {
                            releases.push({
                                Name: rData.Name,
                                ObjectID: [rData.ObjectID],
                                Workspace: [rData.Workspace],
                                ReleaseStartDate: rData.ReleaseStartDate,
                                ReleaseDate: rData.ReleaseDate
                            });
                        }
                    });

                    releases = _.sortBy(releases, 'Name');
                    console.log(releases.length);
                    deferred.resolve(releases);
                }
            }
        });

        return deferred.promise;
    },

    createFilteredCombobox: function(filteredReleases) {
        var combobox = Ext.create('Ext.form.field.ComboBox', {
            fieldLabel: 'Choose Release',
            store: Ext.create('Ext.data.Store', {
                data: filteredReleases,
                fields: ['Name', 'ObjectID']
            }),
            displayField: 'Name',
            valueField: 'ObjectId',
            width: 600,
            listeners: {
                select: function(combo, record) {
                    var data = record[0].getData();
                }
            }
        });

        this.add(combobox);
    },

    _isLikeReleaseInList: function(releases, releaseName) {
        return _.find(releases, function(release) {
            return release.Name === releaseName
        });
    }
});
