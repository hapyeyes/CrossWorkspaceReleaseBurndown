Ext.define('CrossWorkspaceReleaseBurndownCalculator', {
    extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',

    constructor: function(config) {
        this.initConfig(config);
        this.callParent(arguments);
    },

    getMetrics: function () {
        return [
            {
                "field": "AcceptedDate",
                "as": "Accepted Points",
                "display": "line",
                "f": "sum"
            }
        ];
    }
});
