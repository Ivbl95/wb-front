import { animate, state, style, transition, trigger } from '@angular/animations';
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
import { BehaviorSubject, combineLatest, map, Observable, startWith, take } from 'rxjs';
import { ColumnHeaderNamePipe } from '../../pipes/column-header-name.pipe';
import { ApiService } from '../../services/api.service';

enum SortLastMile {
  LM = 'lm',
  All = 'all',
}

enum GetTableRowsDict {
  delta = 'Дельта',
  sortingCenter = 'СЦ',
  date = 'Дата',
  id = 'ID',
  sortedOn = 'Отсортировано на СЦ',
  sortedFor = 'Отсортировано для СЦ',
}

enum getExpandedTableRowsDict {
  delta = 'Дельта',
  sortingCenter = 'Место сортировки для СЦ',
  date = 'Дата',
  id = 'ID',
  sortedOn = 'Отсортировали в СЦ',
  sortedFor = 'Отсортировали для СЦ',
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
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  templateUrl: './sorting-deviation.component.html',
  styleUrl: './sorting-deviation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SortingDeviationComponent {
  @ViewChild(MatSort) sort: MatSort | null = null;
  public expandedElement: any;

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

  public preparedTableRows$: Observable<any> = this.apiService
    .getTableRows()
    .pipe(map((jsonData: any) => this.prepareTableRows(jsonData.query_result.data.rows, GetTableRowsDict)));

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

  public preparedExpandedTableRows$: BehaviorSubject<any> = new BehaviorSubject<any>({});

  constructor(private apiService: ApiService) {}

  public processRowClick(row: any): void {
    this.expandedElement = this.expandedElement === row ? null : row;
    const preparedExpandedTableRows: any = this.preparedExpandedTableRows$.getValue() as Object;

    if (!preparedExpandedTableRows.hasOwnProperty(row.sortingCenter)) {
      this.getExpandedTableRows(row);
    }
  }

  public getExpandedTableRows(row: any): void {
    this.apiService
      .getExpandedTableRows(row.id)
      .pipe(take(1))
      .subscribe((result: any) => {
        if (!result.query_result?.data.rows) {
          return;
        }

        this.preparedExpandedTableRows$.next({
          ...this.preparedExpandedTableRows$.getValue(),
          [row.sortingCenter]: this.prepareTableRows(result.query_result?.data.rows, getExpandedTableRowsDict),
        });
      });
  }

  public expandedTableRows$: Observable<any> = combineLatest([
    this.preparedExpandedTableRows$,
    this.firstColumnIdsList$,
  ]).pipe(
    map(([tableRows, firstColumnIdsList]: [any[], string[]]) => {
      if (!this.expandedElement) {
        return tableRows;
      }

      tableRows[this.expandedElement.sortingCenter] = this.prepareTableRowsWithSum(
        tableRows[this.expandedElement.sortingCenter],
        firstColumnIdsList
      );

      return tableRows;
    })
  );

  public preparedTableRowsWithSum$: Observable<any> = combineLatest([
    this.preparedTableRows$,
    this.firstColumnIdsList$,
  ]).pipe(
    map(([tableRows, firstColumnIdsList]: [any[], string[]]) => {
      return new MatTableDataSource<any>(this.prepareTableRowsWithSum(tableRows, firstColumnIdsList));
    })
  );

  public tableRows$: Observable<any> = combineLatest([this.preparedTableRowsWithSum$, this.searchFieldValue$]).pipe(
    map(([tableRows, searchFieldValue]: [MatTableDataSource<any>, string]) => {
      tableRows.sort = this.sort;
      tableRows.filter = searchFieldValue?.trim() ?? '';
      return tableRows;
    })
  );

  public prepareTableRowsWithSum(tableRows: any[], firstColumnIdsList: any[]): any {
    return tableRows.map((row: any) => {
      row['sum-delta'] = 0;
      row['sum-sortedOn'] = 0;
      row['sum-sortedFor'] = 0;

      firstColumnIdsList.forEach((columnId: string) => {
        this.columnsTypes.forEach((columnsType: string) => {
          if (columnId.includes(columnsType)) {
            row[`sum-${columnsType}`] += row[columnId] ?? 0;
          }
        });
      });

      const percentDifference: number = row['sum-delta'] / row['sum-sortedOn'] || 0;
      row['sum-delta-cell-color'] = this.calcCellColor(percentDifference);

      return row;
    });
  }

  public prepareTableRows(responseArr: any[], dict: typeof GetTableRowsDict | typeof getExpandedTableRowsDict): any[] {
    if (!responseArr) {
      return [];
    }

    const preparedRows: any = {};

    responseArr.forEach((responseElement: any) => {
      const sortingCenter: string = responseElement[dict.sortingCenter];
      const date: string = responseElement[dict.date];
      const id: string = responseElement[dict.id];
      const cellValues: number[] = [
        responseElement[dict.delta],
        responseElement[dict.sortedOn],
        responseElement[dict.sortedFor],
      ];

      if (!preparedRows[sortingCenter]) {
        preparedRows[sortingCenter] = {
          sortingCenter,
          id,
        };
      }

      [SortLastMile.All, SortLastMile.LM].forEach((sortLastMile: SortLastMile) => {
        this.columnsTypes.forEach((columnType: string, index: number) => {
          if (sortLastMile === SortLastMile.All || (sortLastMile === SortLastMile.LM && responseElement['ПМ'] === 1)) {
            const id: string = `${date}-${sortLastMile}-${columnType}`;
            preparedRows[sortingCenter][id] = (preparedRows[sortingCenter][id] ?? 0) + cellValues[index];
          }
        });

        const idDelta: string = `${date}-${sortLastMile}-delta`;
        const idSortedOn: string = `${date}-${sortLastMile}-sortedOn`;
        const idCellColor: string = `${date}-${sortLastMile}-delta-cell-color`;
        const percentDifference: number =
          preparedRows[sortingCenter][idDelta] / preparedRows[sortingCenter][idSortedOn] || 0;
        preparedRows[sortingCenter][idCellColor] = this.calcCellColor(percentDifference);
      });
    });

    return Object.values(preparedRows);
  }
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
