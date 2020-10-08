// Copyright 2017 The Kubernetes Authors.
// Copyright 2020 Authors of Arktos - file modified.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {timer} from 'rxjs';
import {Observable} from 'rxjs/Observable';
import {publishReplay, refCount, switchMap, switchMapTo} from 'rxjs/operators';

import {ResourceBase} from '../../resources/resource';
import {GlobalSettingsService} from '../global/globalsettings';
import {NamespaceService} from '../global/namespace';
import {TenantService} from '../global/tenant';

@Injectable()
export class ResourceService<T> extends ResourceBase<T> {
  /**
   * We need to provide HttpClient here since the base is not annotated with
   * @Injectable
   */
  constructor(
    readonly http: HttpClient,
    private readonly tenant_: TenantService,
    private readonly settings_: GlobalSettingsService,
  ) {
    super(http);
  }

  private getTenant_(): string {
    return this.tenant_.current();
  }

  get(endpoint: string, name?: string, params?: HttpParams, tenant?: string): Observable<T> {
    if (name) {
      endpoint = endpoint.replace(':name', name);
    }

    if (tenant) {
      endpoint = endpoint.replace(':tenant', tenant);
    } else if (this.getTenant_()) {
      endpoint = endpoint.replace(':tenant', this.getTenant_());
    } else {
      endpoint = endpoint.replace('/:tenant', ''); // use shorthand api
    }

    return this.settings_.onSettingsUpdate
      .pipe(
        switchMap(() => {
          let interval = this.settings_.getResourceAutoRefreshTimeInterval();
          interval = interval === 0 ? undefined : interval * 1000;
          return timer(0, interval);
        }),
      )
      .pipe(switchMapTo(this.http_.get<T>(endpoint, {params})))
      .pipe(publishReplay(1))
      .pipe(refCount());
  }
}

@Injectable()
export class NamespacedResourceService<T> extends ResourceBase<T> {
  constructor(
    readonly http: HttpClient,
    private readonly tenant_: TenantService,
    private readonly namespace_: NamespaceService,
    private readonly settings_: GlobalSettingsService,
  ) {
    super(http);
  }

  private getTenant_(): string {
    return this.tenant_.current();
  }

  private getNamespace_(): string {
    const currentNamespace = this.namespace_.current();
    return this.namespace_.isMultiNamespace(currentNamespace) ? ' ' : currentNamespace;
  }

  get(
    endpoint: string,
    name?: string,
    namespace?: string,
    params?: HttpParams,
    tenant?: string,
  ): Observable<T> {
    if (namespace) {
      endpoint = endpoint.replace(':namespace', namespace);
    } else {
      endpoint = endpoint.replace(':namespace', this.getNamespace_());
    }

    if (name) {
      endpoint = endpoint.replace(':name', name);
    }

    if (tenant) {
      endpoint = endpoint.replace(':tenant', tenant);
    } else if (this.getTenant_()) {
      endpoint = endpoint.replace(':tenant', this.getTenant_());
    } else {
      endpoint = endpoint.replace('/:tenant', ''); // use shorthand api
    }

    return this.settings_.onSettingsUpdate
      .pipe(
        switchMap(() => {
          let interval = this.settings_.getResourceAutoRefreshTimeInterval();
          interval = interval === 0 ? undefined : interval * 1000;
          return timer(0, interval);
        }),
      )
      .pipe(switchMapTo(this.http_.get<T>(endpoint, {params})))
      .pipe(publishReplay(1))
      .pipe(refCount());
  }
}
