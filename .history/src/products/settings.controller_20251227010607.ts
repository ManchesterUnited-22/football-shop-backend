@Controller('settings') // Đây là phần 'settings' trong URL
export class SettingsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('global-promotion') // Đây là phần 'global-promotion' trong URL
  async applyGlobalSale(@Body() data: any) {
    // Gọi xuống service để xử lý trừ tiền toàn bộ sản phẩm
    return this.productsService.updateAllPrices(data);
  }
}