//#region ../../../frontend/node_modules/vinext/dist/utils/deployment-id.js
var NEXT_DEPLOYMENT_ID_HEADER = "x-deployment-id";
function getDeploymentId() {
	return process.env.__VINEXT_DEPLOYMENT_ID || process.env.NEXT_DEPLOYMENT_ID || void 0;
}
function applyDeploymentIdHeader(headers, deploymentId = getDeploymentId()) {
	if (deploymentId) headers.set(NEXT_DEPLOYMENT_ID_HEADER, deploymentId);
}
//#endregion
export { applyDeploymentIdHeader as n, getDeploymentId as r, NEXT_DEPLOYMENT_ID_HEADER as t };

//# sourceMappingURL=deployment-id-DLqJDCJ3.js.map