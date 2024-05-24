import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'columnHeaderName',
  standalone: true,
  pure: true,
})
export class ColumnHeaderNamePipe implements PipeTransform {
  transform(columnId: string): string {
    if (columnId === 'sortingCenter') {
      return 'СЦ';
    }

    if (columnId === 'sum') {
      return 'Всего';
    }

    if (columnId.includes('delta')) {
      return 'Дельта';
    }

    if (columnId.includes('sortedOn')) {
      return 'Отсортировано на СЦ';
    }

    if (columnId.includes('sortedFor')) {
      return 'Отсортировано для СЦ';
    }

    return columnId !== 'empty' && columnId ? columnId : '';
  }
}
