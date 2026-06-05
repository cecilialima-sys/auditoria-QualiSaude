const https = require("https");

const serviceId = process.env.RENDER_SERVICE_ID || "srv-d8hg45vlk1mc73egthlg";
const apiKey = process.env.RENDER_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL || "https://muznilpevhyhmyyjenvv.supabase.co";

if (!apiKey) {
  console.error("Defina RENDER_API_KEY no ambiente antes de atualizar variáveis no Render.");
  process.exit(1);
}

function updateEnvVar(key, value) {
  const payload = JSON.stringify({ value });

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.render.com",
        path: `/v1/services/${serviceId}/env-vars/${encodeURIComponent(key)}`,
        method: "PUT",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve();
            return;
          }
          reject(new Error(`Render respondeu ${response.statusCode} para ${key}: ${body}`));
        });
      }
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

Promise.all([
  updateEnvVar("SUPABASE_URL", supabaseUrl),
  updateEnvVar("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl)
])
  .then(() => {
    console.log(`Variáveis Supabase atualizadas no Render para o serviço ${serviceId}.`);
  })
  .catch((error) => {
    console.error(`Erro ao chamar Render API: ${error.message}`);
    process.exit(1);
  });
