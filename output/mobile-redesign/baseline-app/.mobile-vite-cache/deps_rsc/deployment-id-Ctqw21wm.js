//#region ../../../frontend/node_modules/vinext/dist/utils/deployment-id.js
var NEXT_DEPLOYMENT_ID_HEADER = "x-deployment-id";
function getDeploymentId() {
	return process.env.__VINEXT_DEPLOYMENT_ID || process.env.NEXT_DEPLOYMENT_ID || void 0;
}
function appendDeploymentIdQuery(value, deploymentId = getDeploymentId()) {
	if (!deploymentId) return value;
	const hashIndex = value.indexOf("#");
	const url = hashIndex === -1 ? value : value.slice(0, hashIndex);
	const fragment = hashIndex === -1 ? "" : value.slice(hashIndex);
	if (new URL(url, "http://vinext.local").searchParams.has("dpl")) return value;
	return `${url}${url.includes("?") ? "&" : "?"}dpl=${deploymentId}${fragment}`;
}
function appendAssetDeploymentIdQuery(value, deploymentId = getDeploymentId()) {
	if (!new URL(value, "http://vinext.local").pathname.includes("/_next/static/")) return value;
	return appendDeploymentIdQuery(value, deploymentId);
}
function applyDeploymentIdHeader(headers, deploymentId = getDeploymentId()) {
	if (deploymentId) headers.set(NEXT_DEPLOYMENT_ID_HEADER, deploymentId);
}
//#endregion
export { getDeploymentId as i, appendAssetDeploymentIdQuery as n, applyDeploymentIdHeader as r, NEXT_DEPLOYMENT_ID_HEADER as t };

//# sourceMappingURL=deployment-id-Ctqw21wm.js.map