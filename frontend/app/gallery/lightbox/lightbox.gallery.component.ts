import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild
} from '@angular/core';
import {PhotoDTO} from '../../../../common/entities/PhotoDTO';
import {GalleryPhotoComponent} from '../grid/photo/photo.grid.gallery.component';
import {Dimension} from '../../model/IRenderable';
import {FullScreenService} from '../fullscreen.service';
import {OverlayService} from '../overlay.service';
import {animate, AnimationBuilder, AnimationPlayer, style} from '@angular/animations';
import {GalleryLightboxPhotoComponent} from './photo/photo.lightbox.gallery.component';
import {Observable, Subscription, timer} from 'rxjs';
import {filter} from 'rxjs/operators';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {PageHelper} from '../../model/page.helper';
import {QueryService} from '../../model/query.service';

export enum LightboxStates {
  Open = 1,
  Closing = 2,
  Closed = 3
}

@Component({
  selector: 'app-gallery-lightbox',
  styleUrls: ['./lightbox.gallery.component.css'],
  templateUrl: './lightbox.gallery.component.html'
})
export class GalleryLightboxComponent implements OnDestroy, OnInit {

  @ViewChild('photo') photoElement: GalleryLightboxPhotoComponent;
  @ViewChild('lightbox') lightboxElement: ElementRef;

  public navigation = {hasPrev: true, hasNext: true};
  public blackCanvasOpacity: any = 0;

  private activePhotoId: number = null;
  public activePhoto: GalleryPhotoComponent;
  private gridPhotoQL: QueryList<GalleryPhotoComponent>;

  public status: LightboxStates = LightboxStates.Closed;
  private subscription: {
    photosChange: Subscription,
    route: Subscription
  } = {
    photosChange: null,
    route: null
  };
  private timer: Observable<number>;
  private timerSub: Subscription;
  public playBackState = 0;
  public controllersDimmed = true;
  public controllersVisible = true;

  public infoPanelVisible = false;
  public infoPanelWidth = 0;
  public animating = false;
  startPhotoDimension: Dimension = <Dimension>{top: 0, left: 0, width: 0, height: 0};
  iPvisibilityTimer = null;
  visibilityTimer = null;
  delayedPhotoShow: string = null;


  constructor(public fullScreenService: FullScreenService,
              private changeDetector: ChangeDetectorRef,
              private overlayService: OverlayService,
              private _builder: AnimationBuilder,
              private router: Router,
              private queryService: QueryService,
              private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.timer = timer(1000, 2000);
    this.subscription.route = this.route.queryParams.subscribe((params: Params) => {
      if (params[QueryService.PHOTO_PARAM] && params[QueryService.PHOTO_PARAM] !== '') {
        if (!this.gridPhotoQL) {
          return this.delayedPhotoShow = params[QueryService.PHOTO_PARAM];
        }
        this.onNavigateTo(params[QueryService.PHOTO_PARAM]);
      } else if (this.status === LightboxStates.Open) {
        this.delayedPhotoShow = null;
        this.hideLigthbox();
      }
    });
  }

  ngOnDestroy(): void {
    this.pause();
    if (this.subscription.photosChange != null) {
      this.subscription.photosChange.unsubscribe();
    }
    if (this.subscription.route != null) {
      this.subscription.route.unsubscribe();
    }

    if (this.visibilityTimer != null) {
      clearTimeout(this.visibilityTimer);
    }
    if (this.iPvisibilityTimer != null) {
      clearTimeout(this.iPvisibilityTimer);
    }
  }

  onNavigateTo(photoName: string) {
    if (this.activePhoto && this.activePhoto.gridPhoto.photo.name === photoName) {
      return;
    }
    const photo = this.gridPhotoQL.find(i => i.gridPhoto.photo.name === photoName);
    if (!photo) {
      return this.delayedPhotoShow = photoName;
    }
    if (this.status === LightboxStates.Closed) {
      this.showLigthbox(photo.gridPhoto.photo);
    } else {
      this.showPhoto(this.gridPhotoQL.toArray().indexOf(photo));
    }
    this.delayedPhotoShow = null;
  }

  setGridPhotoQL(value: QueryList<GalleryPhotoComponent>) {
    if (this.subscription.photosChange != null) {
      this.subscription.photosChange.unsubscribe();
    }
    this.gridPhotoQL = value;
    this.subscription.photosChange = this.gridPhotoQL.changes.subscribe(() => {
      if (this.activePhotoId != null && this.gridPhotoQL.length > this.activePhotoId) {
        this.updateActivePhoto(this.activePhotoId);
      }
      if (this.delayedPhotoShow) {
        this.onNavigateTo(this.delayedPhotoShow);
      }
    });

    if (this.delayedPhotoShow) {
      this.onNavigateTo(this.delayedPhotoShow);
    }
  }

//noinspection JSUnusedGlobalSymbols
  @HostListener('window:resize', ['$event'])
  onResize() {
    if (this.activePhoto) {
      this.animateLightbox();
      this.updateActivePhoto(this.activePhotoId);
    }
  }

  public nextImage() {
    if (this.activePhotoId + 1 < this.gridPhotoQL.length) {
      this.navigateToPhoto(this.activePhotoId + 1);
      /*if (this.activePhotoId + 3 >= this.gridPhotoQL.length) {
        this.onLastElement.emit({}); // trigger to render more photos if there are
      }*/
      return;
    }
  }

  public prevImage() {
    this.pause();
    if (this.activePhotoId > 0) {
      this.navigateToPhoto(this.activePhotoId - 1);
      return;
    }
  }


  private navigateToPhoto(photoIndex: number) {
    this.router.navigate([],
      {queryParams: this.queryService.getParams(this.gridPhotoQL.toArray()[photoIndex].gridPhoto.photo)});
    /*
        this.activePhoto = null;
        this.changeDetector.detectChanges();
        this.updateActivePhoto(photoIndex, resize);*/
  }

  private showPhoto(photoIndex: number, resize: boolean = true) {
    this.activePhoto = null;
    this.changeDetector.detectChanges();
    this.updateActivePhoto(photoIndex, resize);
  }

  public showLigthbox(photo: PhotoDTO) {
    this.controllersVisible = true;
    this.showControls();
    this.status = LightboxStates.Open;
    const selectedPhoto = this.findPhotoComponent(photo);
    if (selectedPhoto === null) {
      throw new Error('Can\'t find Photo');
    }

    const lightboxDimension = selectedPhoto.getDimension();
    lightboxDimension.top -= PageHelper.ScrollY;
    this.animating = true;
    this.animatePhoto(selectedPhoto.getDimension(), this.calcLightBoxPhotoDimension(selectedPhoto.gridPhoto.photo)).onDone(() => {
      this.animating = false;
    });
    this.animateLightbox(
      lightboxDimension,
      <Dimension>{
        top: 0,
        left: 0,
        width: this.getPhotoFrameWidth(),
        height: this.getPhotoFrameHeight()
      });


    this.blackCanvasOpacity = 0;
    this.startPhotoDimension = selectedPhoto.getDimension();
    // disable scroll
    this.overlayService.showOverlay();
    this.blackCanvasOpacity = 1.0;
    this.showPhoto(this.gridPhotoQL.toArray().indexOf(selectedPhoto), false);
  }

  //noinspection JSUnusedGlobalSymbols
  @HostListener('window:keydown', ['$event'])
  onKeyPress(e: KeyboardEvent) {
    if (this.status !== LightboxStates.Open) {
      return;
    }
    const event: KeyboardEvent = window.event ? <any>window.event : e;
    switch (event.key) {
      case 'ArrowLeft':
        if (this.activePhotoId > 0) {
          this.prevImage();
        }
        break;
      case 'ArrowRight':
        if (this.activePhotoId < this.gridPhotoQL.length - 1) {
          this.nextImage();
        }
        break;
      case 'Escape': // escape
        this.hide();
        break;
    }
  }

  public hide() {
    this.router.navigate([],
      {queryParams: this.queryService.getParams()});
  }

  private hideLigthbox() {
    this.controllersVisible = false;
    this.status = LightboxStates.Closing;
    this.fullScreenService.exitFullScreen();
    this.pause();

    this.animating = true;
    const lightboxDimension = this.activePhoto.getDimension();
    lightboxDimension.top -= PageHelper.ScrollY;
    this.blackCanvasOpacity = 0;

    this.animatePhoto(this.calcLightBoxPhotoDimension(this.activePhoto.gridPhoto.photo), this.activePhoto.getDimension());
    this.animateLightbox(<Dimension>{
      top: 0,
      left: 0,
      width: this.getPhotoFrameWidth(),
      height: this.getPhotoFrameHeight()
    }, lightboxDimension).onDone(() => {
      this.status = LightboxStates.Closed;
      this.activePhoto = null;
      this.activePhotoId = null;
      this.overlayService.hideOverlay();
    });


    this.hideInfoPanel(false);

  }


  animatePhoto(from: Dimension, to: Dimension = from): AnimationPlayer {
    const elem = this._builder.build([
      style(<any>Dimension.toString(from)),
      animate(300,
        style(<any>Dimension.toString(to)))
    ])
      .create(this.photoElement.elementRef.nativeElement);
    elem.play();
    return elem;
  }

  animateLightbox(from: Dimension = <Dimension>{
    top: 0,
    left: 0,
    width: this.getPhotoFrameWidth(),
    height: this.getPhotoFrameHeight()
  }, to: Dimension = from): AnimationPlayer {
    const elem = this._builder.build([
      style(<any>Dimension.toString(from)),
      animate(300,
        style(<any>Dimension.toString(to)))
    ])
      .create(this.lightboxElement.nativeElement);
    elem.play();
    return elem;
  }


  public toggleInfoPanel() {


    if (this.infoPanelWidth !== 400) {
      this.showInfoPanel();
    } else {
      this.hideInfoPanel();
    }

  }

  hideInfoPanel(_animate: boolean = true) {
    this.iPvisibilityTimer = setTimeout(() => {
      this.iPvisibilityTimer = null;
      this.infoPanelVisible = false;
    }, 1000);

    const starPhotoPos = this.calcLightBoxPhotoDimension(this.activePhoto.gridPhoto.photo);
    this.infoPanelWidth = 0;
    const endPhotoPos = this.calcLightBoxPhotoDimension(this.activePhoto.gridPhoto.photo);
    if (_animate) {
      this.animatePhoto(starPhotoPos, endPhotoPos);
    }
    if (_animate) {
      this.animateLightbox(<Dimension>{
          top: 0,
          left: 0,
          width: Math.max(this.getPhotoFrameWidth() - 400, 0),
          height: this.getPhotoFrameHeight()
        },
        <Dimension>{
          top: 0,
          left: 0,
          width: this.getPhotoFrameWidth(),
          height: this.getPhotoFrameHeight()
        });
    }
  }

  public play() {
    this.pause();
    this.timerSub = this.timer.pipe(filter(t => t % 2 === 0)).subscribe(() => {
      if (this.photoElement.imageLoadFinished === false) {
        return;
      }
      if (this.navigation.hasNext) {
        this.nextImage();
      } else {
        this.navigateToPhoto(0);
      }
    });
    this.playBackState = 1;
  }

  showInfoPanel() {
    this.infoPanelVisible = true;

    const starPhotoPos = this.calcLightBoxPhotoDimension(this.activePhoto.gridPhoto.photo);
    this.infoPanelWidth = 400;
    const endPhotoPos = this.calcLightBoxPhotoDimension(this.activePhoto.gridPhoto.photo);
    this.animatePhoto(starPhotoPos, endPhotoPos);
    this.animateLightbox(<Dimension>{
        top: 0,
        left: 0,
        width: this.getPhotoFrameWidth() + 400,
        height: this.getPhotoFrameHeight()
      },
      <Dimension>{
        top: 0,
        left: 0,
        width: this.getPhotoFrameWidth(),
        height: this.getPhotoFrameHeight()
      });
    if (this.iPvisibilityTimer != null) {
      clearTimeout(this.iPvisibilityTimer);
    }
  }

  public fastForward() {
    this.pause();
    this.timerSub = this.timer.subscribe(() => {
      if (this.photoElement.imageLoadFinished === false) {
        return;
      }
      if (this.navigation.hasNext) {
        this.nextImage();
      } else {
        this.navigateToPhoto(0);
      }
    });
    this.playBackState = 2;
  }


  public getPhotoFrameWidth(): number {
    return Math.max(window.innerWidth - this.infoPanelWidth, 0);
  }

  public getPhotoFrameHeight(): number {
    return window.innerHeight;
  }

  public getWindowAspectRatio(): number {
    return Math.round(this.getPhotoFrameWidth() / this.getPhotoFrameHeight() * 100) / 100;
  }

  private updateActivePhoto(photoIndex: number, resize: boolean = true) {
    const pcList = this.gridPhotoQL.toArray();


    if (photoIndex < 0 || photoIndex > this.gridPhotoQL.length) {
      throw new Error('Can\'t find the photo');
    }
    this.activePhotoId = photoIndex;
    this.activePhoto = pcList[photoIndex];

    if (resize) {
      this.animatePhoto(this.calcLightBoxPhotoDimension(this.activePhoto.gridPhoto.photo));
    }
    this.navigation.hasPrev = photoIndex > 0;
    this.navigation.hasNext = photoIndex + 1 < pcList.length;

    const to = this.activePhoto.getDimension();

    // if target image out of screen -> scroll to there
    if (PageHelper.ScrollY > to.top || PageHelper.ScrollY + this.getPhotoFrameHeight() < to.top) {
      PageHelper.ScrollY = to.top;
    }

  }


  @HostListener('mousemove')
  onMouseMove() {
    this.showControls();
  }

  private showControls() {
    this.controllersDimmed = true;
    if (this.visibilityTimer != null) {
      clearTimeout(this.visibilityTimer);
    }
    this.visibilityTimer = setTimeout(this.hideControls, 2000);
  }

  private hideControls = () => {

    this.controllersDimmed = false;
  };


  public pause() {
    if (this.timerSub != null) {
      this.timerSub.unsubscribe();
    }
    this.playBackState = 0;
  }

  private findPhotoComponent(photo: any): GalleryPhotoComponent {
    const galleryPhotoComponents = this.gridPhotoQL.toArray();
    for (let i = 0; i < galleryPhotoComponents.length; i++) {
      if (galleryPhotoComponents[i].gridPhoto.photo === photo) {
        return galleryPhotoComponents[i];
      }
    }
    return null;
  }

  private calcLightBoxPhotoDimension(photo: PhotoDTO): Dimension {
    let width = 0;
    let height = 0;
    const photoAspect = photo.metadata.size.width / photo.metadata.size.height;
    const windowAspect = this.getPhotoFrameWidth() / this.getPhotoFrameHeight();
    if (photoAspect < windowAspect) {
      width = Math.round(photo.metadata.size.width * (this.getPhotoFrameHeight() / photo.metadata.size.height));
      height = this.getPhotoFrameHeight();
    } else {
      width = this.getPhotoFrameWidth();
      height = Math.round(photo.metadata.size.height * (this.getPhotoFrameWidth() / photo.metadata.size.width));
    }
    const top = (this.getPhotoFrameHeight() / 2 - height / 2);
    const left = (this.getPhotoFrameWidth() / 2 - width / 2);

    return <Dimension>{top: top, left: left, width: width, height: height};
  }

  public isVisible(): boolean {
    return this.status !== LightboxStates.Closed;
  }
}

