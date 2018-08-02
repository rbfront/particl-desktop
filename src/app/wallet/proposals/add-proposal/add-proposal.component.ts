import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Log } from 'ng2-logger';
import { Observable } from 'rxjs/Observable';

import { FormArray } from '@angular/forms/src/model';
import { ProposalsService } from 'app/wallet/proposals/proposals.service';
import { ProfileService } from 'app/core/market/api/profile/profile.service';
import { SnackbarService } from 'app/core/snackbar/snackbar.service';
import { Profile } from 'app/core/market/api/profile/profile.model';
import { PeerService } from 'app/core/rpc/peer/peer.service';

import {
  ProposalConfirmationComponent
} from 'app/modals/proposal-confirmation/proposal-confirmation.component';
import { ModalsHelperService } from 'app/modals/modals-helper.service';

@Component({
  selector: 'app-add-proposal',
  templateUrl: './add-proposal.component.html',
  styleUrls: ['./add-proposal.component.scss']
})
export class AddProposalComponent implements OnInit {

  log: any = Log.create('add-item.component');
  private destroyed: boolean = false;
  public isTnCAccepted: boolean = false;
  private profileId: number;
  // form controls
  public proposalFormGroup: FormGroup;

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private dialog: MatDialog,
    private modalService: ModalsHelperService,
    private peerService: PeerService,
    private proposalsService: ProposalsService,
    private profileService: ProfileService,
    private snackbarService: SnackbarService
  ) { }

  ngOnInit() {
    // get default profile address.
    this.profileService.default().takeWhile(() => true).subscribe((profile: Profile) => {
      this.profileId = profile.id;
    })

    this.proposalFormGroup = this.formBuilder.group({
      title: ['', Validators.compose([Validators.required, Validators.maxLength(50)])],
      desc: ['', Validators.compose([Validators.required, Validators.maxLength(2000)])],
      options: this.formBuilder.array([
        this.initOptionFields(),
        this.initOptionFields()
      ]),

      // @TODO `nickname` and `email` use in the "Contact Information" section.
      // nickname: ['', Validators.compose([Validators.maxLength(50)])],
      // email: ['',  Validators.compose([Validators.maxLength(150)])]
    });

  }

  initOptionFields(): FormGroup {
    return this.formBuilder.group({
      option: ['', Validators.compose([Validators.required, Validators.maxLength(50)])]
    });
  }

  /**
   * Programmatically generates a new option input field
   *
   * @public
   * @method addNewInputField
   * @return {none}
   */
  addNewInputField(): void {
    const control = <FormArray>this.proposalFormGroup.controls.options;
    control.push(this.initOptionFields());
  }


  /**
   * Programmatically removes a recently generated option input field
   *
   * @public
   * @method removeInputField
   * @param i    {number}      The position of the object in the array that needs to removed
   * @return {none}
   */
  removeInputField(i: number): void {
    const control = <FormArray>this.proposalFormGroup.controls.options;
    control.removeAt(i);
  }

  cancelAndDiscard() {
    this.router.navigate(['/wallet/proposals']);
  }

  submitProposal() {
    const dialogRef = this.dialog.open(ProposalConfirmationComponent);

    dialogRef.componentInstance.setData({
      ... this.proposalFormGroup.value,
      options: this.proposalFormGroup.value.options.map(v => v.option),
    },
      (proposal) => this.addPost(proposal)
    );
  }

  addPost(proposal: any): void {

    // check wallet status (unlock if locked ?).
    this.modalService.unlock({}, () => this.addPostCall(proposal))
  }

  addPostCall(proposal: any): void {
    // get current block count.
    this.peerService.getBlockCount().take(1).subscribe((startBlock: number) => {
      /**
       *  endBlockCount calculated based on formula <startBlockCount>.
       *  endBlockCount = startBlockCount + 7 Days * 720 (particl block generate in a day).
       */

      const endBlockCount = startBlock + 7 * 720;
      // add proposal.

      this.proposalsService.post([
        'post',
        this.profileId,
        proposal.title,
        proposal.desc,
        startBlock,
        endBlockCount,
        ...proposal.options
      ]).subscribe((response) => {
        this.snackbarService.open(
          'Proposal posted successfully. Your proposal will get published shortly !',
          'info'
        )

        // redirect to proposals page.
        this.cancelAndDiscard();
      }, (error) => {
        this.snackbarService.open(error.message, 'warn')
      })
    })
  }

}