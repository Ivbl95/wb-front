import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { combineLatest, map, Observable, startWith } from 'rxjs';
import { ColumnHeaderNamePipe } from '../../pipes/column-header-name.pipe';
import { ApiService } from '../../services/api.service';

enum SortLastMile {
  LM = 'lm',
  All = 'all',
}

const RECENT_DAYS_COUNT: number = 30;
const INIT_LAST_MILE: SortLastMile = SortLastMile.All;
const INIT_SORT_COLUMN_TYPES: string[] = ['delta', 'sortedOn', 'sortedFor'];
const RECENT_DAYS_COUNT_ARRAY: number[] = Array.from({ length: RECENT_DAYS_COUNT }, (_, index) => index + 1).reverse();

@Component({
  selector: 'app-sorting-deviation',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatSortModule,
    ColumnHeaderNamePipe,
  ],
  templateUrl: './sorting-deviation.component.html',
  styleUrl: './sorting-deviation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SortingDeviationComponent {
  @ViewChild(MatSort) sort: MatSort | null = null;

  public formGroup: FormGroup<any> = new FormGroup<any>({
    sortLastMile: new FormControl<SortLastMile>(INIT_LAST_MILE, { nonNullable: true }),
    sortRecentDaysCount: new FormControl<number>(RECENT_DAYS_COUNT, { nonNullable: true }),
    sortColumnTypes: new FormControl<string[]>(INIT_SORT_COLUMN_TYPES, { nonNullable: true }),
    searchField: new FormControl<string>('', { nonNullable: true }),
  });

  public sortLastMileValue$: Observable<SortLastMile> = this.formGroup
    .get('sortLastMile')!
    .valueChanges.pipe(startWith(INIT_LAST_MILE));
  public sortRecentDaysCountValue$: Observable<number> = this.formGroup
    .get('sortRecentDaysCount')!
    .valueChanges.pipe(startWith(RECENT_DAYS_COUNT));
  public sortColumnTypesValue$: Observable<string[]> = this.formGroup
    .get('sortColumnTypes')!
    .valueChanges.pipe(startWith(INIT_SORT_COLUMN_TYPES));
  public searchFieldValue$: Observable<string> = this.formGroup.get('searchField')!.valueChanges.pipe(startWith(''));
  public columnsTypesCount$: Observable<number> = this.sortColumnTypesValue$.pipe(
    map((showingColumns: string[]) => showingColumns.length)
  );

  public columnsTypes: string[] = INIT_SORT_COLUMN_TYPES;
  public recentDaysCountArray: number[] = RECENT_DAYS_COUNT_ARRAY;
  public SortLastMileType: typeof SortLastMile = SortLastMile;

  public enableDates$: Observable<string[]> = this.sortRecentDaysCountValue$.pipe(
    map((sortRecentDaysCount: number) => {
      const enableDates: string[] = [];
      const today = new Date();

      for (let i = 0; i < sortRecentDaysCount; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const formattedDate = date.toISOString().split('T')[0];
        enableDates.push(formattedDate);
      }

      return enableDates.sort().reverse();
    })
  );

  public firstColumnIdsList$: Observable<string[]> = combineLatest([
    this.sortLastMileValue$,
    this.sortColumnTypesValue$,
    this.enableDates$,
  ]).pipe(
    map(([sortLastMile, sortColumnTypes, enableDates]: [string, string[], string[]]) => {
      const sumColumns: string[] = sortColumnTypes
        .map((column: string) => `sum-${column}`)
        .filter((column: string) => column);

      const dateColumns: string[] = enableDates.flatMap((date: string) =>
        sortColumnTypes.map((column: string) => `${date}-${sortLastMile}-${column}`)
      );

      return ['sortingCenter', ...sumColumns, ...dateColumns];
    })
  );

  public secondColumnIdsList$: Observable<string[]> = this.enableDates$.pipe(
    map((enableDates: string[]) => {
      return ['empty', 'sum', ...enableDates];
    })
  );

  public preparedData$: Observable<any> = this.apiService.getTableData().pipe(
    map((jsonData: any) => {
      const rows: any[] = jsonData.query_result.data.rows;
      const preparedData: any = {};

      rows.forEach((element: any) => {
        const center: string = element['СЦ'];
        const date: string = element['Дата'];
        const cellValues: number[] = [
          element['Дельта'],
          element['Отсортировано на СЦ'],
          element['Отсортировано для СЦ'],
        ];

        if (!preparedData[center]) {
          preparedData[center] = {
            sortingCenter: center,
          };
        }

        [SortLastMile.All, SortLastMile.LM].forEach((sortLastMile: SortLastMile) => {
          this.columnsTypes.forEach((columnType: string, index: number) => {
            if (sortLastMile === SortLastMile.All || (sortLastMile === SortLastMile.LM && element['ПМ'] === 1)) {
              const id: string = `${date}-${sortLastMile}-${columnType}`;
              preparedData[center][id] = (preparedData[center][id] ?? 0) + cellValues[index];
            }
          });

          const idDelta: string = `${date}-${sortLastMile}-delta`;
          const idSortedOn: string = `${date}-${sortLastMile}-sortedOn`;
          const idCellColor: string = `${date}-${sortLastMile}-delta-cell-color`;
          const percentDifference: number = preparedData[center][idDelta] / preparedData[center][idSortedOn] || 0;

          preparedData[center][idCellColor] = this.calcCellColor(percentDifference);
        });
      });

      return Object.values(preparedData);
    })
  );

  public preparedDataWithSum$: Observable<any> = combineLatest([this.preparedData$, this.firstColumnIdsList$]).pipe(
    map(([preparedData, firstColumnIdsList]: [any[], string[]]) => {
      const preparedDataWithSum: any = preparedData.map((preparedDataRow: any) => {
        preparedDataRow['sum-delta'] = 0;
        preparedDataRow['sum-sortedOn'] = 0;
        preparedDataRow['sum-sortedFor'] = 0;

        firstColumnIdsList.forEach((columnId: string) => {
          this.columnsTypes.forEach((columnsType: string) => {
            if (columnId.includes(columnsType)) {
              preparedDataRow[`sum-${columnsType}`] += preparedDataRow[columnId] ?? 0;
            }
          });
        });

        const percentDifference: number = preparedDataRow['sum-delta'] / preparedDataRow['sum-sortedOn'] || 0;
        preparedDataRow['sum-delta-cell-color'] = this.calcCellColor(percentDifference);

        return preparedDataRow;
      });

      return new MatTableDataSource<any>(preparedDataWithSum);
    })
  );

  public calcCellColor(percentDifference: number): string {
    if (percentDifference >= 0.3) {
      return 'red';
    } else if (percentDifference >= 0.1 && percentDifference < 0.3) {
      return 'yellow';
    } else if (percentDifference >= 0 && percentDifference < 0.1) {
      return 'white';
    } else {
      return 'green';
    }
  }

  public tableData$: Observable<any> = combineLatest([this.preparedDataWithSum$, this.searchFieldValue$]).pipe(
    map(([tableData, searchFieldValue]: [MatTableDataSource<any>, string]) => {
      tableData.sort = this.sort;
      tableData.filter = searchFieldValue?.trim() ?? '';
      return tableData;
    })
  );

  constructor(private apiService: ApiService) {}
}
// interface CellValue {
//   delta: number;
//   sortedOn: number;
//   sortedFor: number;
// }

// interface SortLastMileInfo {
//   [SortLastMile.All]: CellValue;
//   [SortLastMile.LM]: CellValue;
// }

// interface DateInfo {
//   [date: string]: SortLastMileInfo;
// }

// interface SortingCenterInfo {
//   sortingCenter: string;
//   dates: DateInfo[];
// }
