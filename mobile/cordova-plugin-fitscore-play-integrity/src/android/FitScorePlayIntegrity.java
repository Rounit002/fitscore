package com.fitscore.playintegrity;

import com.google.android.gms.tasks.Task;
import com.google.android.play.core.integrity.IntegrityManagerFactory;
import com.google.android.play.core.integrity.StandardIntegrityManager;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class FitScorePlayIntegrity extends CordovaPlugin {
    private StandardIntegrityManager integrityManager;
    private Task<StandardIntegrityManager.StandardIntegrityTokenProvider> providerTask;
    private long cloudProjectNumber;
    private String configurationError;

    @Override
    protected void pluginInitialize() {
        integrityManager = IntegrityManagerFactory.createStandard(
            cordova.getActivity().getApplicationContext()
        );

        String configuredProjectNumber = preferences
            .getString("PlayIntegrityCloudProjectNumber", "0")
            .trim();
        try {
            cloudProjectNumber = Long.parseLong(configuredProjectNumber);
            if (cloudProjectNumber <= 0) {
                configurationError = "PlayIntegrityCloudProjectNumber must be configured";
                return;
            }
        } catch (NumberFormatException error) {
            configurationError = "PlayIntegrityCloudProjectNumber must be a numeric Google Cloud project number";
            return;
        }

        getOrPrepareProvider();
    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext)
        throws JSONException {
        if ("getConfiguration".equals(action)) {
            callbackContext.success(buildConfiguration());
            return true;
        }
        if ("requestToken".equals(action)) {
            String requestHash = args.optString(0, "").trim();
            if (requestHash.isEmpty() || requestHash.length() > 500) {
                callbackContext.error("A valid request hash is required");
                return true;
            }
            if (configurationError != null) {
                callbackContext.error(configurationError);
                return true;
            }
            requestToken(requestHash, callbackContext);
            return true;
        }
        return false;
    }

    private synchronized Task<StandardIntegrityManager.StandardIntegrityTokenProvider>
        getOrPrepareProvider() {
        if (providerTask == null) {
            StandardIntegrityManager.PrepareIntegrityTokenRequest request =
                StandardIntegrityManager.PrepareIntegrityTokenRequest.builder()
                    .setCloudProjectNumber(cloudProjectNumber)
                    .build();
            providerTask = integrityManager.prepareIntegrityToken(request);
            providerTask.addOnFailureListener(error -> clearProvider());
        }
        return providerTask;
    }

    private synchronized void clearProvider() {
        providerTask = null;
    }

    private void requestToken(String requestHash, CallbackContext callbackContext) {
        getOrPrepareProvider()
            .addOnSuccessListener(provider -> {
                StandardIntegrityManager.StandardIntegrityTokenRequest request =
                    StandardIntegrityManager.StandardIntegrityTokenRequest.builder()
                        .setRequestHash(requestHash)
                        .build();

                provider.request(request)
                    .addOnSuccessListener(response -> callbackContext.success(response.token()))
                    .addOnFailureListener(error -> {
                        clearProvider();
                        callbackContext.error(safeErrorMessage(error));
                    });
            })
            .addOnFailureListener(error -> callbackContext.error(safeErrorMessage(error)));
    }

    private JSONObject buildConfiguration() throws JSONException {
        JSONObject result = new JSONObject();
        JSONArray origins = new JSONArray();
        String configuredOrigins = preferences
            .getString("PlayIntegrityAllowedOrigins", "")
            .trim();
        if (!configuredOrigins.isEmpty()) {
            for (String origin : configuredOrigins.split(",")) {
                String normalized = origin.trim().replaceAll("/+$", "");
                if (!normalized.isEmpty()) origins.put(normalized);
            }
        }
        result.put("allowedOrigins", origins);
        result.put("configured", configurationError == null);
        return result;
    }

    private String safeErrorMessage(Exception error) {
        String message = error.getMessage();
        return message == null || message.trim().isEmpty()
            ? error.getClass().getSimpleName()
            : message;
    }
}
