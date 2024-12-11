import { DurationUnit } from "../schema/CallRate";
import { Currency } from "../schema/Credit";

interface PriceDetail {
  duration: number;
  durationUnit: string;
  price: number;
  tax: number;
  currency: string;
}

interface PageDetail {
  field: string;
  defaultValue: number
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

export const parsePayload = (input: string = '{}', fields: string[]): any => {
  const parsedPayload:any = {};
  const payloadInput = JSON.parse(input);
  for(let currField of fields) {
      if(payloadInput[currField] && payloadInput[currField]?.trim()) {
          parsedPayload[`${currField}`] = new RegExp(escapeRegex(payloadInput[currField]?.trim()), 'i')
      }
  }
  return parsedPayload;
}

export const parsePagination = (input: string = '{}', fields: PageDetail[]): any => {
  const parsedPayload:any = {};
  const payloadInput = JSON.parse(input);
  for(let currField of fields) {
      const field = currField.field;
      const defaultValue = currField.defaultValue;
      let fieldValue = payloadInput[field] && !Number.isNaN(payloadInput[field]) ? parseInt(payloadInput[field] + "") : defaultValue;
      fieldValue = fieldValue > 0 ? fieldValue : 1;
      parsedPayload[`${field}`] = fieldValue;
  }
  return parsedPayload;
}

// Helper fn to validate phone number
export const validPhoneNumber = (input: string = ""): boolean => {
  const phoneNumberRegex = new RegExp(/^\d{10}$/);
  return phoneNumberRegex.test(input)
}

// Helper fn to validate phone number
export const validCountryCode = (input: string = ""): boolean => {
  const countryCodeRegex = new RegExp(/^\+(\d{1}\-)?(\d{1,3})$/);
  return countryCodeRegex.test(input)
}
