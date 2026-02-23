import { Injectable, BadRequestException } from '@nestjs/common';
import { BillType } from '../dto/pay-bill.dto';

@Injectable()
export class MockBillerService {
  private async simulateDelay() {
    return new Promise(resolve => setTimeout(resolve, 800));
  }

  private validateCustomer(billType: BillType, customerId: string) {
    const isNumeric = /^\d+$/.test(customerId);
    if (!isNumeric) {
      throw new BadRequestException('Customer ID must contain only digits');
    }
    if (billType === BillType.AIRTIME && customerId.length !== 11) {
      throw new BadRequestException('Invalid Phone Number: Must be exactly 11 digits');
    }
    if (billType === BillType.CABLE_TV && customerId.length !== 10) {
      throw new BadRequestException('Invalid SmartCard Number: Must be exactly 10 digits');
    }
  }

  async payBill(billType: BillType, customerId: string, amount: number) {
    this.validateCustomer(billType, customerId);
    await this.simulateDelay();

    // Mock transaction rejection using static value
    if (amount === 999) {
      throw new Error('External provider rejected the transaction');
    }

    return {
      providerTxnId: `ext_${Math.random().toString(36).substring(7)}`,
      status: 'SUCCESS',
      message:
        billType === BillType.AIRTIME
          ? `Airtime sent to ${customerId}`
          : `Cable TV subscription renewed for ${customerId}`,
    };
  }
}
