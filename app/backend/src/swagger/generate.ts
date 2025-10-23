import { swaggerSpec } from './swagger.config';
import fs from 'fs';
import path from 'path';

/**
 * Generate Swagger documentation files
 */
export const generateDocumentation = (): void => {
  try {
    // Ensure docs directory exists
    const docsDir = path.join(__dirname, '../../../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Write OpenAPI spec to JSON file
    const specPath = path.join(docsDir, 'api-spec.json');
    fs.writeFileSync(specPath, JSON.stringify(swaggerSpec, null, 2));

    // Generate Markdown documentation
    const markdownPath = path.join(docsDir, 'API.md');
    const markdown = generateMarkdownDocumentation(swaggerSpec);
    fs.writeFileSync(markdownPath, markdown);

    console.log('📚 API documentation generated successfully!');
    console.log(`📄 OpenAPI spec: ${specPath}`);
    console.log(`📋 Markdown docs: ${markdownPath}`);
    console.log(`🌐 Swagger UI: http://localhost:5000/api-docs`);
  } catch (error) {
    console.error('❌ Failed to generate documentation:', error);
  }
};

/**
 * Generate Markdown documentation from OpenAPI spec
 */
const generateMarkdownDocumentation = (spec: any): string => {
  let markdown = `# ${spec.info.title}\n\n`;
  markdown += `${spec.info.description}\n\n`;
  markdown += `**Version:** ${spec.info.version}\n\n`;

  if (spec.info.contact) {
    markdown += `**Contact:** ${spec.info.contact.name} <${spec.info.contact.email}>\n\n`;
  }

  markdown += `## Authentication\n\n`;
  markdown += `All protected endpoints require a Bearer token in the Authorization header:\n\n`;
  markdown += `\`\`\`\n`;
  markdown += `Authorization: Bearer <your-jwt-token>\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `## Base URL\n\n`;
  if (spec.servers && spec.servers.length > 0) {
    spec.servers.forEach((server: any) => {
      markdown += `- ${server.description}: \`${server.url}\`\n`;
    });
  }
  markdown += `\n`;

  // Group endpoints by tags
  const endpointsByTag: { [key: string]: any[] } = {};

  if (spec.paths) {
    Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
      Object.entries(methods).forEach(([method, details]: [string, any]) => {
        const endpoint = {
          method: method.toUpperCase(),
          path,
          summary: details.summary,
          description: details.description,
          parameters: details.parameters || [],
          requestBody: details.requestBody,
          responses: details.responses || {},
          tags: details.tags || ['General'],
        };

        endpoint.tags.forEach((tag: string) => {
          if (!endpointsByTag[tag]) {
            endpointsByTag[tag] = [];
          }
          endpointsByTag[tag].push(endpoint);
        });
      });
    });
  }

  // Generate documentation for each tag
  Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
    markdown += `## ${tag}\n\n`;

    endpoints.forEach((endpoint) => {
      markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;

      if (endpoint.summary) {
        markdown += `**Summary:** ${endpoint.summary}\n\n`;
      }

      if (endpoint.description) {
        markdown += `${endpoint.description}\n\n`;
      }

      // Parameters
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        markdown += `**Parameters:**\n\n`;
        markdown += `| Name | In | Type | Required | Description |\n`;
        markdown += `|------|----|------|----------|-------------|\n`;

        endpoint.parameters.forEach((param: any) => {
          const schema = param.schema || {};
          markdown += `| \`${param.name}\` | ${param.in} | ${schema.type || 'string'} | ${param.required ? 'Yes' : 'No'} | ${param.description || ''} |\n`;
        });
        markdown += `\n`;
      }

      // Request Body
      if (endpoint.requestBody && endpoint.requestBody.content && endpoint.requestBody.content['application/json']) {
        const requestSchema = endpoint.requestBody.content['application/json'].schema;
        markdown += `**Request Body:**\n\n`;
        markdown += `\`\`\`json\n`;
        markdown += JSON.stringify(requestSchema.example || requestSchema, null, 2);
        markdown += `\n\`\`\`\n\n`;
      }

      // Responses
      if (endpoint.responses) {
        markdown += `**Responses:**\n\n`;
        Object.entries(endpoint.responses).forEach(([statusCode, response]: [string, any]) => {
          markdown += `**${statusCode}:** ${response.description}\n\n`;

          if (response.content && response.content['application/json']) {
            const responseSchema = response.content['application/json'].schema;
            markdown += `\`\`\`json\n`;
            markdown += JSON.stringify(responseSchema.example || responseSchema, null, 2);
            markdown += `\n\`\`\`\n\n`;
          }
        });
      }

      markdown += `---\n\n`;
    });
  });

  return markdown;
};

// Run generation if called directly
if (require.main === module) {
  generateDocumentation();
}
