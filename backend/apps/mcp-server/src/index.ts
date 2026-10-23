import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { mcpToolsService } from '@/mcp/mcp-tools.service.js';

async function main() {
  const server = new McpServer({
    name: 'food-delivery-mcp-server',
    version: '1.0.0',
  });

  // Tool 1: search_dishes
  server.tool(
    'search_dishes',
    'Tìm kiếm món ăn theo từ khóa, giá tối đa, đánh giá nhà hàng và danh mục ẩm thực từ dữ liệu thực tế.',
    {
      query: z.string().optional().describe('Từ khóa tìm kiếm (tên món, mô tả)'),
      maxPrice: z.number().optional().describe('Mức giá tối đa (VNĐ)'),
      categoryName: z.string().optional().describe('Tên danh mục (ví dụ: Phở, Bún bò, Cơm tấm)'),
      minRating: z.number().optional().describe('Điểm đánh giá nhà hàng tối thiểu (ví dụ: 4.5)'),
      limit: z.number().optional().describe('Số lượng kết quả trả về tối đa (mặc định 20)'),
    },
    async (args) => {
      try {
        const dishes = await mcpToolsService.searchDishes(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(dishes, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Lỗi khi tìm kiếm món ăn: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // Tool 2: get_restaurants_nearby
  server.tool(
    'get_restaurants_nearby',
    'Tìm kiếm các nhà hàng lân cận theo kinh độ/vĩ độ và bán kính phục vụ.',
    {
      latitude: z.number().describe('Vĩ độ khách hàng (ví dụ: 10.7769)'),
      longitude: z.number().describe('Kinh độ khách hàng (ví dụ: 106.7009)'),
      radiusKm: z.number().optional().describe('Bán kính tìm kiếm (km, mặc định 5km)'),
      limit: z.number().optional().describe('Số lượng nhà hàng tối đa (mặc định 20)'),
    },
    async (args) => {
      try {
        const restaurants = await mcpToolsService.getRestaurantsNearby(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(restaurants, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Lỗi khi tìm kiếm nhà hàng lân cận: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // Tool 3: get_restaurant_menu
  server.tool(
    'get_restaurant_menu',
    'Lấy danh sách thực đơn đầy đủ kèm tùy chọn topping/size của một nhà hàng cụ thể.',
    {
      restaurantId: z.string().uuid().describe('ID định danh của nhà hàng'),
    },
    async (args) => {
      try {
        const menu = await mcpToolsService.getRestaurantMenu(args.restaurantId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(menu, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Lỗi khi tải thực đơn nhà hàng: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  // Tool 4: ai_recommend_dishes
  server.tool(
    'ai_recommend_dishes',
    'Gợi ý món ăn thông minh từ sở thích, ngân sách, tâm trạng với cơ chế fallback tự động.',
    {
      preferencePrompt: z.string().describe('Mô tả nhu cầu, sở thích hoặc trạng thái hiện tại (ví dụ: đang ốm muốn ăn gì đó ấm bụng)'),
      maxBudget: z.number().optional().describe('Ngân sách tối đa (VNĐ)'),
      mood: z.string().optional().describe('Tâm trạng hoặc thời tiết (ví dụ: mệt mỏi, trời mưa lạnh, vui vẻ)'),
    },
    async (args) => {
      try {
        const recommendation = await mcpToolsService.aiRecommendDishes(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(recommendation, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Lỗi khi gợi ý món ăn: ${(error as Error).message}`,
            },
          ],
        };
      }
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FoodDelivery MCP Server started successfully on stdio transport.');
}

main().catch((err) => {
  console.error('Fatal error starting FoodDelivery MCP Server:', err);
  process.exit(1);
});
