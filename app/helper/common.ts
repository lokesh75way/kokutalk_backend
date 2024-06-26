import { DurationUnit } from "../schema/CallRate";
import { Currency } from "../schema/Credit";

interface PriceDetail {
  duration: number;
  durationUnit: string;
  price: number;
  tax: number;
  currency: string;
}

export const  calculatePrice = (startTime: Date, endTime: Date, priceDetail: PriceDetail| null = null): number => {
  if(!priceDetail) {
    return 0;
  }
  const { duration = 1, durationUnit = DurationUnit.MINUTE, price = 0, currency = Currency.USD, tax = 0 } = priceDetail || { };
  const priceDuration = duration > 0 ? duration : 1;
  const callDuration = calculateDuration(startTime, endTime, durationUnit);

  return Math.ceil(callDuration/priceDuration)*price + tax;
}

const calculateDuration = (startTime: Date, endTime: Date, unit: string = DurationUnit.MINUTE): number => {
  const difference = Math.abs(new Date(endTime).getTime() - new Date(startTime).getTime());  
  switch (unit) {
      case DurationUnit.HOUR:
        return Math.ceil(difference/(60*60*1000));
      case DurationUnit.MINUTE:
        return Math.ceil(difference/(60*1000));
      case DurationUnit.SECOND:
        return Math.ceil(difference/(1000));
      default:
        return 0;
    }
}

// Helper fn to replace special character as literal character in regex string
export const escapeRegex = (input: string): string => {
   return input.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
