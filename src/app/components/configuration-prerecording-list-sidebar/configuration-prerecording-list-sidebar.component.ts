import { Component, ViewContainerRef } from '@angular/core';
import { ModalHandle, ModalInstance, ModalService } from '../../modules/modal/modal.service';
import { PrerecordingService, Recording } from '../../states/prerecording.service';
import {
  ConfigurationPrerecordingSidebarComponent
} from '../configuration-prerecording-sidebar/configuration-prerecording-sidebar.component';

@Component({
  selector: 'app-configuration-prerecording-list-sidebar',
  templateUrl: './configuration-prerecording-list-sidebar.component.html',
  styleUrls: ['./configuration-prerecording-list-sidebar.component.scss']
})
export class ConfigurationPrerecordingListSidebarComponent implements ModalInstance<void> {
  state$ = this.prerecording.state$;

  constructor(private prerecording: PrerecordingService,
              private viewContainerRef: ViewContainerRef,
              private modalService: ModalService,) {
  }

  modal!: ModalHandle<void>;

  edit(index:number, rec: Recording) {
    this.modalService.sidebar({
      component: ConfigurationPrerecordingSidebarComponent,
      title: 'Edit prerecording',
      subtitle: 'Prescripted answer',
      props: {
        index,
        recording: rec,
      },
    })
  }

  create() {
    this.modalService.sidebar({
      component: ConfigurationPrerecordingSidebarComponent,
      title: 'Create prerecording',
      subtitle: 'Prescripted answer',
      props: {},
    })
  }

  export() {
    const data = [
      ['content', 'rate'],
    ];
    for(let i = 0; i < this.prerecording.length(); i++) {
      const recording = this.prerecording.get(i);
      data.push([recording.content, (recording.rate || 1).toString()]);
    }
    downloadCSV(data, 'preprecordings.csv');
  }

  import() {
    alert('Not implemented yet.');
  }
}

function downloadCSV(data: string[][], filename: string): void {
  const csvContent = data.map(row => row.map(escapeAndQuote).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('download', filename);
  link.setAttribute('href', url);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeAndQuote(field: string): string {
  const escapedField = field.replace(/"/g, '""');
  if (escapedField.includes(",") || escapedField.includes("\n") || escapedField.includes("\r")) {
    return `"${escapedField}"`;
  }
  return escapedField;
}
