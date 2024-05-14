import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  startWith,
} from 'rxjs';
import { ColumnHeaderNamePipe } from '../../pipes/column-header-name.pipe';
import { ApiService } from '../../services/api.service';

enum SortingMode {
  PM = 'pm',
  All = 'all',
}

const DAYS_COUNT_TO_SHOW: number = 30;
const INIT_SORTING_MODE: SortingMode = SortingMode.All;
const SHOWING_COLUMNS_LIST: string[] = ['delta', 'sortedOn', 'sortedFor'];
const DAYS_COUNT_TO_SHOW_ARRAY: number[] = Array.from(
  { length: DAYS_COUNT_TO_SHOW },
  (_, index) => index + 1
).reverse();

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
  public filterValue$: BehaviorSubject<string | null> = new BehaviorSubject<
    string | null
  >(null);

  public sortingMode: FormControl<SortingMode> = new FormControl<SortingMode>(
    INIT_SORTING_MODE,
    { nonNullable: true }
  );
  public daysCountToShow: FormControl<number> = new FormControl<number>(
    DAYS_COUNT_TO_SHOW,
    { nonNullable: true }
  );

  public showingColumns: FormControl<string[]> = new FormControl<string[]>(
    SHOWING_COLUMNS_LIST,
    {
      nonNullable: true,
    }
  );

  public showingColumnsValue$: Observable<string[]> =
    this.showingColumns.valueChanges.pipe(startWith(SHOWING_COLUMNS_LIST));

  public showingColumnsList: string[] = SHOWING_COLUMNS_LIST;
  public daysCountToShowArray: number[] = DAYS_COUNT_TO_SHOW_ARRAY;
  public SortingMode: typeof SortingMode = SortingMode;

  public showingColumnsCount: Observable<number> =
    this.showingColumnsValue$.pipe(
      map((showingColumns: string[]) => showingColumns.length)
    );

  public showingDatesList$: Observable<string[]> =
    this.daysCountToShow.valueChanges.pipe(
      startWith(DAYS_COUNT_TO_SHOW),
      map((daysCountToShow: number) => {
        const showingDatesList: string[] = [];
        const today = new Date();

        for (let i = 0; i < daysCountToShow; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const formattedDate = date.toISOString().split('T')[0];
          showingDatesList.push(formattedDate);
        }

        return showingDatesList.sort().reverse();
      })
    );

  public firstColumnIdsList$: Observable<string[]> = combineLatest([
    this.sortingMode.valueChanges.pipe(startWith(INIT_SORTING_MODE)),
    this.showingColumnsValue$,
    this.showingDatesList$,
  ]).pipe(
    map(
      ([sortingMode, showingColumns, showingDatesList]: [
        string,
        string[],
        string[]
      ]) => {
        const sumColumns = showingColumns
          .map((column: string) => `all-${column}`)
          .filter((column) => column);

        const dateColumns = showingDatesList.flatMap((date: string) =>
          showingColumns.map(
            (column: string) => `${date}-${sortingMode}-${column}`
          )
        );

        return ['sortingCenter', ...sumColumns, ...dateColumns];
      }
    )
  );

  public secondColumnIdsList$: Observable<string[]> =
    this.showingDatesList$.pipe(
      map((showingDatesList: string[]) => {
        return ['empty', 'all', ...showingDatesList];
      })
    );

  public jsonData$: Observable<any> = this.apiService.getTableData().pipe(
    map((jsonData: any) => {
      const rows = jsonData.query_result.data.rows;
      const tempData: any = {};

      rows.forEach((element: any) => {
        const center: string = element['СЦ'];
        const date: string = element['Дата'];
        const values: number[] = [
          element['Дельта'],
          element['Отсортировано на СЦ'],
          element['Отсортировано для СЦ'],
        ];

        if (!tempData[center]) {
          tempData[center] = {
            sortingCenter: center,
          };
        }

        this.showingColumnsList.forEach((key, index) => {
          [SortingMode.All, SortingMode.PM].forEach(
            (sortingMode: SortingMode) => {
              if (
                sortingMode === SortingMode.All ||
                (sortingMode === SortingMode.PM && element['ПМ'] === 1)
              ) {
                const dateKey = `${date}-${sortingMode}-${key}`;
                tempData[center][dateKey] =
                  (tempData[center][dateKey] ?? 0) + values[index];
              }
            }
          );
        });
      });

      return Object.values(tempData);
    })
  );

  public tableData$: Observable<any> = combineLatest([
    this.jsonData$,
    this.firstColumnIdsList$,
  ]).pipe(
    map(([jsonData, firstColumnIdsList]: [any[], string[]]) => {
      jsonData = jsonData.map((jsonRow: any) => {
        const row: any = {
          'all-delta': 0,
          'all-sortedOn': 0,
          'all-sortedFor': 0,
        };
        firstColumnIdsList.forEach((columnId: string) => {
          row[columnId] = jsonRow[columnId] ?? 0;

          if (columnId.includes('delta')) {
            row['all-delta'] += jsonRow[columnId] ?? 0;
          }

          if (columnId.includes('sortedOn')) {
            row['all-sortedOn'] += jsonRow[columnId] ?? 0;
          }

          if (columnId.includes('sortedFor')) {
            row['all-sortedFor'] += jsonRow[columnId] ?? 0;
          }
        });

        return row;
      });

      return new MatTableDataSource<any>(jsonData);
    })
  );

  public data$: Observable<any> = combineLatest([
    this.tableData$,
    this.filterValue$,
  ]).pipe(
    map(
      ([tableData, filterValue]: [MatTableDataSource<any>, string | null]) => {
        tableData.sort = this.sort;
        tableData.filter = filterValue ?? '';
        return tableData;
      }
    )
  );

  constructor(private apiService: ApiService) {}
  public setFilterValue(event: Event) {
    this.filterValue$.next(
      (event.target as HTMLInputElement).value.trim().toLowerCase()
    );
  }
}
