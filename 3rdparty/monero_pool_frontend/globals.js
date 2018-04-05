'use strict';

angular.module('pool.globals', [])

.factory('GLOBALS', function() {
	return {
		pool_name: "XMRPool",
		api_url : '${POOL_API_URL}',
		api_refresh_interval: 5000,
		app_update_interval: 5*60000
	};
});